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
