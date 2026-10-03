import type { PDFFont } from "pdf-lib";

/**
 * pdf-lib's built-in fonts (Helvetica, Times) only know the WinAnsi (Latin-1-ish)
 * character set, and `drawText` / `widthOfTextAtSize` THROW on anything else —
 * so one Arabic, Cyrillic, Turkish or emoji character in a student's name made
 * the ID card download return an empty HTTP 500 and made processing an
 * admission fail permanently ("WinAnsi cannot encode …"). Found in the
 * 2026-10-02 audit (HANDOVER Part 33, findings ID-1 / AD-1).
 *
 * This wraps a font so characters it can't encode are drawn as "?" instead of
 * throwing: the document is always produced, Latin text is unchanged, and the
 * real (correct) name stays in the database. PROPER Arabic support needs an
 * embedded Unicode font plus RTL shaping, which is a separate piece of work
 * (see the audit report) — this is the safe floor so nothing crashes.
 */
export function makeFontSafe(font: PDFFont): PDFFont {
  const supported = new Set(font.getCharacterSet());
  const clean = (text: string) =>
    Array.from(text)
      .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");

  const encodeText = font.encodeText.bind(font);
  const widthOfTextAtSize = font.widthOfTextAtSize.bind(font);
  font.encodeText = (text: string) => encodeText(clean(text));
  font.widthOfTextAtSize = (text: string, size: number) => widthOfTextAtSize(clean(text), size);
  return font;
}
