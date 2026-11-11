import localFont from "next/font/local";

/**
 * The card's own typefaces for the on-page view (spec §1.2): Montserrat 500 /
 * 600 and Noto Serif 800, self-hosted from the very same files the PDF embeds
 * (lib/idcard/fonts/) so the screen and the download measure identically.
 * Not part of the app's general font stack on purpose — the card is a fixed
 * design, not themeable UI. `adjustFontFallback: false` keeps next/font from
 * injecting a size-adjusted Arial fallback that would change widths while the
 * font loads.
 */
export const idCardSans = localFont({
  src: [
    { path: "../../lib/idcard/fonts/montserrat-latin-500-normal.woff", weight: "500", style: "normal" },
    { path: "../../lib/idcard/fonts/montserrat-latin-600-normal.woff", weight: "600", style: "normal" },
  ],
  display: "block",
  adjustFontFallback: false,
  fallback: ["sans-serif"],
});

/** Carries a student's name when it is written in Arabic (Montserrat has no Arabic glyphs). */
export const idCardArabic = localFont({
  src: [{ path: "../../lib/idcard/fonts/noto-sans-arabic-arabic-600-normal.woff", weight: "600", style: "normal" }],
  display: "block",
  adjustFontFallback: false,
  fallback: ["sans-serif"],
});

export const idCardSerif = localFont({
  src: [{ path: "../../lib/idcard/fonts/noto-serif-latin-800-normal.woff", weight: "800", style: "normal" }],
  display: "block",
  adjustFontFallback: false,
  fallback: ["serif"],
});
