import "server-only";

/**
 * Derives WebAuthn's rpID (bare domain, no protocol/port) and origin (full
 * scheme+host+port) from NEXT_PUBLIC_SITE_URL — the app's existing source
 * of truth for its own origin (already used to build the old password-reset
 * email link; see HANDOVER.md). Works unchanged on both localhost dev and
 * the real production domain, since neither is hardcoded here.
 */
function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(raw);
}

export function getRpID(): string {
  return siteUrl().hostname;
}

export function getOrigin(): string {
  return siteUrl().origin;
}

export const RP_NAME = "Al Kamal International Studies";

/** Short-lived cookie holding the current WebAuthn ceremony's challenge
 * (registration or authentication — never both at once for the same
 * browser in practice, so one name is fine). Cleared immediately after the
 * matching verify step, success or failure. */
export const WEBAUTHN_CHALLENGE_COOKIE = "webauthn_challenge";
/** Alongside the challenge during the *login* ceremony specifically (there
 * is no authenticated user yet to key off of) — the email the challenge
 * was generated for, so the verify step knows whose credentials to check
 * the response against. Unused during registration (already-authenticated,
 * no need to carry an email through a cookie). */
export const WEBAUTHN_LOGIN_EMAIL_COOKIE = "webauthn_login_email";

/**
 * Set the instant a WebAuthn login ceremony verifies (see
 * verifyWebauthnLoginAction in app/login/webauthnActions.ts), read by
 * lib/auth.ts's requireAdminMfaVerified() as an alternate way to satisfy an
 * admin's step-up-auth requirement, alongside Supabase's own aal2 check.
 *
 * Why a second check is needed at all: this app's WebAuthn/passkey system
 * is entirely custom (@simplewebauthn + the webauthn_credentials table),
 * bridged into a real Supabase session via the generateLink/verifyOtp
 * pattern (see that function's own comment) — it never touches Supabase's
 * native `auth.mfa` API, so a passkey-established session's AAL is aal1
 * regardless of the biometric ceremony that just happened. Without this
 * cookie, an admin who just proved their identity via Face ID/fingerprint/
 * a security key would *still* be sent to /mfa/verify for a TOTP code —
 * correct-but-redundant, since a verified WebAuthn assertion already is a
 * real second factor (something you have: the registered authenticator;
 * something you are: the biometric unlock). Per Muhammad's explicit ask
 * (2026-08-19): password login still requires the 6-digit TOTP code exactly
 * as before; a verified passkey login should not ask for it too.
 *
 * httpOnly + only ever set by trusted server code right after a real
 * cryptographic verification — never client-settable, so this can't be
 * forged independently of actually possessing a registered authenticator.
 * Explicitly cleared at the top of loginAction (password path) and in
 * signOutAction, so a stale marker from an earlier passkey session on the
 * same browser can never satisfy the requirement for a *different*,
 * weaker-factor session established afterward.
 */
export const WEBAUTHN_LOGIN_VERIFIED_COOKIE = "webauthn_login_verified";
