/**
 * Builds an `attachment` Content-Disposition header that is safe for ANY file
 * name. HTTP header values must be ByteStrings (code points <= 0xFF), so a name
 * containing e.g. "Š" or Arabic used to make `new Response(...)` throw and the
 * download return a bare 500 (audit finding ID-1(b), HANDOVER Part 33). The
 * plain `filename` is an ASCII fallback; `filename*` (RFC 5987) carries the real
 * UTF-8 name for every modern browser.
 */
export function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
