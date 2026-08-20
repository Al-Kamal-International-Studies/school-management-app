"use server";

import { cookies } from "next/headers";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, WebAuthnCredential } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/authClient";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";
import { completeLogin } from "@/lib/auth/completeLogin";
import {
  getRpID,
  getOrigin,
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_LOGIN_EMAIL_COOKIE,
  WEBAUTHN_LOGIN_VERIFIED_COOKIE,
} from "@/lib/webauthn/config";

export interface WebauthnLoginState {
  error?: string;
  options?: string;
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

/** Same generic message regardless of *why* — unknown email, or a real
 * account with no biometric credentials registered on any device. Matches
 * this app's existing anti-enumeration convention for login/forgot-password
 * (docs/SECURITY.md's "already verified correct" list) — a wrong guess at
 * someone else's email should never look different from a right one. */
const GENERIC_ERROR = "No biometric sign-in set up for this account, or no matching device found. Use your password instead.";

/** Step 1 — the user has only typed their email so far. Looks up their
 * registered credentials (service-role: no session exists yet) and scopes
 * the authentication ceremony to those specific credential IDs. */
export async function generateWebauthnLoginOptionsAction(email: string): Promise<WebauthnLoginState> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { error: "Enter your email first." };

  const bucket = `login:${trimmedEmail.toLowerCase()}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: LOGIN_MAX_ATTEMPTS, windowSeconds: LOGIN_WINDOW_SECONDS });
  if (limited) {
    return { error: "Too many failed attempts. Wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", trimmedEmail)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (!profile) return { error: GENERIC_ERROR };

  const { data: credentials } = await admin.from("webauthn_credentials").select("credential_id, transports").eq("user_id", profile.id);
  if (!credentials || credentials.length === 0) return { error: GENERIC_ERROR };

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    userVerification: "required",
    allowCredentials: credentials.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
    })),
  });

  const cookieStore = await cookies();
  const cookieOpts = { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 5 * 60 };
  cookieStore.set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, cookieOpts);
  cookieStore.set(WEBAUTHN_LOGIN_EMAIL_COOKIE, trimmedEmail, cookieOpts);

  return { options: JSON.stringify(options) };
}

/** Step 2 — verifies the assertion, mints a real Supabase session for an
 * account WebAuthn itself never produces one for (via the documented
 * generateLink -> verifyOtp bridge — see this function's inline comment),
 * then runs the exact same post-auth pipeline as password login
 * (completeLogin: failed-attempt reset, device-cap check, redirect). */
export async function verifyWebauthnLoginAction(response: AuthenticationResponseJSON, remember: boolean, next?: string): Promise<WebauthnLoginState> {
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
  const email = cookieStore.get(WEBAUTHN_LOGIN_EMAIL_COOKIE)?.value;
  cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);
  cookieStore.delete(WEBAUTHN_LOGIN_EMAIL_COOKIE);

  if (!expectedChallenge || !email) {
    return { error: "This sign-in attempt expired. Try again." };
  }

  const bucket = `login:${email.toLowerCase()}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: LOGIN_MAX_ATTEMPTS, windowSeconds: LOGIN_WINDOW_SECONDS });
  if (limited) {
    return { error: "Too many failed attempts. Wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, failed_login_attempts")
    .eq("email", email)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (!profile) {
    await recordRateLimitAttempt(bucket);
    return { error: GENERIC_ERROR };
  }

  const { data: credentialRow } = await admin
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", profile.id)
    .eq("credential_id", response.id)
    .maybeSingle();

  if (!credentialRow) {
    await recordRateLimitAttempt(bucket);
    return { error: GENERIC_ERROR };
  }

  const credential: WebAuthnCredential = {
    id: credentialRow.credential_id,
    publicKey: new Uint8Array(Buffer.from(credentialRow.public_key, "base64url")),
    counter: credentialRow.counter,
    transports: (credentialRow.transports ?? undefined) as AuthenticatorTransport[] | undefined,
  };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID(),
      credential,
    });
  } catch {
    await recordRateLimitAttempt(bucket);
    return { error: "Could not verify this device." };
  }

  if (!verification.verified) {
    await recordRateLimitAttempt(bucket);
    return { error: "Could not verify this device." };
  }

  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", credentialRow.id);

  // WebAuthn itself never hands back a Supabase session — it only proves
  // possession of a registered authenticator. Bridging that into a real
  // session uses generateLink()/verifyOtp(), the documented Supabase
  // pattern for custom (non-password, non-OAuth) sign-in flows: mint a
  // one-time magic-link token server-side, then immediately redeem it
  // through the regular cookie-aware client so the session cookies
  // actually get set on this response. createAuthClient (not the plain
  // createClient) so "Remember me" still applies to a biometric sign-in
  // exactly like a password one.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !linkData) {
    return { error: "Could not complete sign-in. Try your password instead." };
  }

  const authClient = await createAuthClient(remember);
  const { error: verifyOtpError } = await authClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyOtpError) {
    return { error: "Could not complete sign-in. Try your password instead." };
  }

  // This session was just established via a verified WebAuthn ceremony —
  // mark it as such so requireAdminMfaVerified() (lib/auth.ts) treats that
  // as satisfying an admin's step-up-auth requirement instead of also
  // sending them to /mfa/verify for a redundant TOTP code (see
  // WEBAUTHN_LOGIN_VERIFIED_COOKIE's own doc comment for why one's needed
  // at all). Persistence mirrors the auth session's own "remember me"
  // choice via the same maxAge convention @supabase/ssr uses by default
  // (see createAuthClient's doc comment) — this cookie has to outlive at
  // least as long as the session it's vouching for, on every subsequent
  // request, not just this one.
  cookieStore.set(WEBAUTHN_LOGIN_VERIFIED_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    ...(remember ? { maxAge: 400 * 24 * 60 * 60 } : {}),
  });

  return completeLogin(profile, { email, centerDeniedMessage: GENERIC_ERROR, next });
}
