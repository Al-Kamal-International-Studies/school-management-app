"use server";

import { cookies } from "next/headers";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { getRpID, getOrigin, RP_NAME, WEBAUTHN_CHALLENGE_COOKIE } from "@/lib/webauthn/config";

export interface WebauthnActionState {
  error?: string;
  success?: boolean;
  options?: string; // JSON-stringified PublicKeyCredentialCreationOptionsJSON — see note below
}

/**
 * Step 1 of registering a new biometric credential (Face ID / fingerprint /
 * Windows Hello — whichever the platform offers, WebAuthn abstracts over
 * that automatically). Excludes any credentials this account already has
 * registered so the same authenticator can't be added twice.
 */
export async function generateWebauthnRegistrationOptionsAction(): Promise<WebauthnActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("webauthn_credentials").select("credential_id, transports").eq("user_id", me.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    userName: me.email,
    userID: new TextEncoder().encode(me.id),
    userDisplayName: me.full_name,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
    })),
  });

  const cookieStore = await cookies();
  cookieStore.set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60,
  });

  return { options: JSON.stringify(options) };
}

/** Step 2 — verifies the browser's attestation response and stores the new
 * credential. `response` arrives pre-serialized from the client (it's
 * already JSON — @simplewebauthn/browser's startRegistration() output). */
export async function verifyWebauthnRegistrationAction(response: RegistrationResponseJSON, label: string): Promise<WebauthnActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
  cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);
  if (!expectedChallenge) {
    return { error: "This registration attempt expired. Try again." };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Verification failed." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Could not verify this device." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const supabase = await createClient();
  const { error } = await supabase.from("webauthn_credentials").insert({
    user_id: me.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? null,
    label: label || "Biometric sign-in",
  });
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "webauthn_credential_registered", "webauthn_credentials");
  return { success: true };
}

export async function removeWebauthnCredentialAction(id: string) {
  const me = await getCurrentProfile();
  if (!me) return;
  const supabase = await createClient();
  await supabase.from("webauthn_credentials").delete().eq("id", id);
  await logAuditEvent(me.id, "webauthn_credential_removed", "webauthn_credentials", id);
}
