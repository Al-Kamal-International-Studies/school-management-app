/**
 * Shared geometry for the ID card — one set of numbers driving both the
 * PDF generator (generateIdCard.ts, pdf-lib's own "points" unit, y grows
 * UP from the bottom of the page) and the on-page HTML preview
 * (components/idcard/IdCardView.tsx, converted to CSS percentages of the
 * card's own box so it scales responsively, with y flipped to CSS's
 * top-down convention). Previously these were two independent
 * implementations that only approximately agreed, which is exactly why
 * the downloaded PDF didn't match the preview (Muhammad, chat,
 * 2026-09-09) — the photo box and the details column's structural bounds
 * now come from here in both places, so they can't drift apart again.
 *
 * No "server-only" here and no I/O — plain numbers, safe to import from
 * both a server-side PDF generator and a client-rendered React component.
 */

// CR80 standard ID/credit-card size, in points (72pt = 1in): 3.375in ×
// 2.125in. A genuinely printable card, not just a PDF page shaped like one.
export const CARD_WIDTH = 243;
export const CARD_HEIGHT = 153;

export const PADDING = 8;

export const HEADER_HEIGHT = 36;
export const HEADER_ACCENT_HEIGHT = 3;

export const CONTENT_TOP = CARD_HEIGHT - HEADER_HEIGHT - HEADER_ACCENT_HEIGHT; // 114
export const CONTENT_BOTTOM = 20; // leaves a small gap above the footer rule
export const CONTENT_HEIGHT = CONTENT_TOP - CONTENT_BOTTOM; // 94 — the details column's own full span

// Standard international passport-photo ratio, 35mm × 45mm (width:height)
// — Muhammad's explicit request, chat, 2026-09-09. Sized at a deliberately
// modest fraction of the available content height (not edge-to-edge —
// an earlier version spanned the full height and was reported as "too
// big") and vertically CENTERED within that content area, so the margin
// above and below reads as intentional framing rather than the original
// bug (a photo that stopped abruptly partway down, leaving a lopsided gap
// only at the bottom).
const PASSPORT_RATIO = 35 / 45;
export const PHOTO_HEIGHT = 72;
export const PHOTO_WIDTH = Math.round(PHOTO_HEIGHT * PASSPORT_RATIO); // 56
export const PHOTO_Y = CONTENT_BOTTOM + (CONTENT_HEIGHT - PHOTO_HEIGHT) / 2; // 31, centered

export const DETAILS_GAP = 10; // between the photo and the details column
export const DETAILS_X = PADDING + PHOTO_WIDTH + DETAILS_GAP; // 74
export const DETAILS_WIDTH = CARD_WIDTH - DETAILS_X - PADDING; // 161

export const FOOTER_RULE_Y = 16;
export const FOOTER_TEXT_Y = 8;

/** Percentage helpers for the CSS side — expressing every box as a
 * fraction of the card's own width/height, so the aspect-ratio-locked
 * preview container scales to any on-screen size while staying
 * proportionally identical to the PDF. */
export const pctW = (points: number) => (points / CARD_WIDTH) * 100;
export const pctH = (points: number) => (points / CARD_HEIGHT) * 100;
/** Converts a PDF y-coordinate (distance from the BOTTOM of the card) to a
 * CSS `top` percentage (distance from the TOP), for a box of the given
 * height. */
export const pctTopFromBottom = (yBottom: number, height: number) => pctH(CARD_HEIGHT - yBottom - height);
