/**
 * Validates the post-login `?next=` destination. Only same-site relative
 * paths are honoured — an absolute URL (`https://evil.example/…`), a
 * protocol-relative one (`//evil.example/…`), a backslash trick
 * (`/\evil.example`) or a control character would otherwise turn a freshly
 * signed-in user into a phishing redirect (found in the 2026-10-02 audit,
 * HANDOVER Part 33). Returns undefined for anything else, so the caller falls
 * back to the user's own dashboard.
 */
export function safeNext(next: string | null | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return undefined;
  return next;
}
