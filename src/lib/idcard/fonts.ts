import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit, { type Font } from "@pdf-lib/fontkit";

/**
 * The three font files the card is drawn in (spec §1.2): Montserrat 500 and
 * 600, Noto Serif 800 — Latin subsets from @fontsource (SIL OFL, licences
 * beside the files). Read from disk once and cached; the same bytes feed
 * the PDF (embedded), the measuring below, and — through next/font/local in
 * components/idcard/idCardFonts.ts — the browser, so a measured width here is
 * the width the screen and the PDF draw.
 *
 * next.config.mjs lists this folder in outputFileTracingIncludes, otherwise
 * the serverless bundle would not contain the files read here.
 */
export type IdCardFontKey = "sans500" | "sans600" | "serif800";

const FILES: Record<IdCardFontKey, string> = {
  sans500: "montserrat-latin-500-normal.woff",
  sans600: "montserrat-latin-600-normal.woff",
  serif800: "noto-serif-latin-800-normal.woff",
};

export interface LoadedFont {
  bytes: Uint8Array;
  font: Font;
}

let cache: Promise<Record<IdCardFontKey, LoadedFont>> | null = null;

export function loadIdCardFonts(): Promise<Record<IdCardFontKey, LoadedFont>> {
  cache ??= (async () => {
    const dir = path.join(process.cwd(), "src", "lib", "idcard", "fonts");
    const entries = await Promise.all(
      (Object.entries(FILES) as [IdCardFontKey, string][]).map(async ([key, file]) => {
        const bytes = new Uint8Array(await readFile(path.join(dir, file)));
        return [key, { bytes, font: fontkit.create(bytes) }] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<IdCardFontKey, LoadedFont>;
  })().catch((error) => {
    cache = null; // don't pin a failed read for the life of the process
    throw error;
  });
  return cache;
}

/** Width in design px of `text` at `size` px, kerning included, plus CSS-style
 * letter-spacing after every character. */
export function textWidth(font: Font, text: string, size: number, letterSpacing = 0): number {
  if (!text) return 0;
  const run = font.layout(text);
  return (run.advanceWidth * size) / font.unitsPerEm + letterSpacing * Array.from(text).length;
}

/** Replace characters the font has no glyph for with "?" so the card never
 * shows a missing-glyph box (the real name stays in the database). */
export function drawable(font: Font, text: string): string {
  return Array.from(text)
    .map((ch) => (font.hasGlyphForCodePoint(ch.codePointAt(0)!) ? ch : "?"))
    .join("");
}
