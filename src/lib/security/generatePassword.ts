import "server-only";

/**
 * Same charset/logic as scripts/bulk-onboard-aket.mjs's own generatePassword
 * (excludes visually-ambiguous characters — no 0/O/1/l/I). Duplicated here
 * rather than having the .mjs scripts import from src/lib (they run via
 * plain `node`, outside the Next.js build, so pulling in a "server-only"
 * TS module would need its own build step) — smaller blast radius than
 * refactoring those already-working, independently-run scripts.
 */
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";

export function generatePassword(length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}
