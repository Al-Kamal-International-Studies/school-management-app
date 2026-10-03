import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tamper-proof marker for "this browser session was established by a verified
 * passkey (WebAuthn) ceremony" — what lets an admin skip the TOTP step-up
 * after a passkey login (see WEBAUTHN_LOGIN_VERIFIED_COOKIE in config.ts).
 *
 * It used to be the constant string "1". `httpOnly` only hides a cookie from
 * page JavaScript — the person at the keyboard can still set any cookie they
 * like — so anyone holding just an admin's PASSWORD could add
 * `webauthn_login_verified=1` in DevTools and walk straight past 2FA (found in
 * the 2026-10-02 audit, HANDOVER Part 33). Now the value is
 * `<userId>.<expiresAtUnix>.<HMAC-SHA256 signature>`, signed with a key derived
 * from a server-only secret, bound to one user id, and expiring. It can only
 * be minted by server code that has just verified a real WebAuthn assertion.
 */

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sign the passkey-login marker.");
  // Domain-separated so this key can never be confused with any other use of the secret.
  return createHmac("sha256", "akis.webauthn-login-marker.v1").update(secret).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function issueVerifiedMarker(userId: string, ttlSeconds: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** True only for an unexpired marker signed by this server for exactly `userId`. */
export function isValidVerifiedMarker(value: string | undefined, userId: string): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [markerUserId, expiresAtRaw, signature] = parts as [string, string, string];
  if (markerUserId !== userId) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(sign(`${markerUserId}.${expiresAtRaw}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
