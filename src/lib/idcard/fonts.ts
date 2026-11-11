import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit, { type Font } from "@pdf-lib/fontkit";

/**
 * The font files the card is drawn in (spec §1.2): Montserrat 500 and 600,
 * Noto Serif 800 — Latin subsets from @fontsource (SIL OFL, licences beside
 * the files) — plus Noto Sans Arabic 600, which carries a student's name when
 * it is written in Arabic (Montserrat has no Arabic glyphs). Read from disk
 * once and cached; the same bytes feed the PDF (embedded), the measuring
 * below, and — through components/idcard/idCardFonts.ts — the browser, so a
 * measured width here is the width the screen and the PDF draw.
 *
 * next.config.mjs lists this folder in outputFileTracingIncludes, otherwise
 * the serverless bundle would not contain the files read here.
 */
export type IdCardFontKey = "sans500" | "sans600" | "serif800" | "arabic600";

const FILES: Record<IdCardFontKey, string> = {
  sans500: "montserrat-latin-500-normal.woff",
  sans600: "montserrat-latin-600-normal.woff",
  serif800: "noto-serif-latin-800-normal.woff",
  arabic600: "noto-sans-arabic-arabic-600-normal.woff",
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

// ---------------------------------------------------------------------------
// Mixed Latin / Arabic text
//
// A name can be Latin, Arabic, or both. The card's base direction is always
// left-to-right (the fixed English layout), so — as the Unicode bidirectional
// algorithm does for an LTR paragraph — Latin text and neutral characters run
// left to right, and each stretch of Arabic (its words and the spaces between
// them) is one right-to-left run, shaped and reversed internally. fontkit
// returns a run's glyphs already in visual order, so drawing an Arabic run as
// one string puts it in the right order.
// ---------------------------------------------------------------------------
export interface TextRun {
  text: string;
  face: "latin" | "arabic";
}

/** U+200F RIGHT-TO-LEFT MARK: invisible; cardModel appends it after the "…" of a
 * truncated Arabic name so the ellipsis belongs to the Arabic run (the browser
 * then puts it at the run's logical end, on the left) — and so does splitRuns. */
export const RLM = "‏";

/**
 * Split `text` into runs in VISUAL left-to-right order: Latin runs, and Arabic
 * runs (which the caller draws right to left, shaped). The base direction is
 * left-to-right, so a neutral (a space, or "…") sits inside an Arabic run only
 * when Arabic text — or an RLM — lies on both sides of it.
 */
export function splitRuns(text: string, latin: Font, arabic: Font | null): TextRun[] {
  if (!arabic) {
    const plain = text.replaceAll(RLM, "");
    return plain ? [{ text: plain, face: "latin" }] : [];
  }
  const chars = Array.from(text);
  const strongArabic = chars.map((ch) => {
    if (ch === RLM) return true;
    const cp = ch.codePointAt(0)!;
    return !latin.hasGlyphForCodePoint(cp) && arabic.hasGlyphForCodePoint(cp);
  });
  const isNeutral = (ch: string) => ch === " " || ch === "…";
  const face = chars.map((ch, i) => {
    if (strongArabic[i]) return "arabic" as const;
    if (isNeutral(ch)) {
      let before = i - 1;
      while (before >= 0 && isNeutral(chars[before]!)) before--;
      let after = i + 1;
      while (after < chars.length && isNeutral(chars[after]!)) after++;
      if (before >= 0 && after < chars.length && strongArabic[before] && strongArabic[after]) return "arabic" as const;
    }
    return "latin" as const;
  });

  const runs: TextRun[] = [];
  chars.forEach((ch, i) => {
    if (ch === RLM) return; // direction marker only, never drawn
    const last = runs[runs.length - 1];
    if (last && last.face === face[i]) last.text += ch;
    else runs.push({ text: ch, face: face[i]! });
  });

  // Visual order: an Arabic run's logical end is its LEFT edge, so a truncation
  // "…" at the end of an Arabic run is drawn (in the Latin face) before it.
  return runs.flatMap((run) =>
    run.face === "arabic" && run.text.endsWith("…")
      ? [{ text: "…", face: "latin" as const }, { text: run.text.slice(0, -1).trimEnd(), face: "arabic" as const }]
      : [run],
  );
}

/** Width in design px of mixed Latin/Arabic text. Letter-spacing applies to
 * the Latin runs only (Arabic letters join and are never letter-spaced). */
export function mixedWidth(latin: Font, arabic: Font | null, text: string, size: number, letterSpacing = 0): number {
  return splitRuns(text, latin, arabic).reduce(
    (sum, run) => sum + (run.face === "arabic" ? textWidth(arabic!, run.text, size) : textWidth(latin, run.text, size, letterSpacing)),
    0,
  );
}

/** Replace characters neither font has a glyph for with "?" so the card never
 * shows a missing-glyph box (the real name stays in the database). */
export function drawable(latin: Font, arabic: Font | null, text: string): string {
  return Array.from(text)
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return latin.hasGlyphForCodePoint(cp) || arabic?.hasGlyphForCodePoint(cp) ? ch : "?";
    })
    .join("");
}
