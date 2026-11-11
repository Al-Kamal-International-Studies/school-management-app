/**
 * Geometry, colours and pure formatting for the student ID card — the single
 * source of truth behind the on-page card (components/idcard/IdCardGraphic.tsx),
 * the PDF (generateIdCard.ts) and the PNG (rasterizeIdCard.ts, which rasterizes
 * that same PDF). Implements "AKIS Student ID Card — Pixel Specification
 * (Design B: Navy & Gold)"; section numbers in the comments refer to that
 * document.
 *
 * Everything is expressed in the spec's design canvas: 1011 × 638 px
 * (CR80 at 300 dpi), origin top-left, y growing down. The SVG component draws
 * it as-is (viewBox); the PDF generator multiplies by PT_PER_PX and flips y.
 *
 * No "server-only" and no imports on purpose: plain data and functions, safe
 * to import from a client or server component and runnable under plain Node
 * (scripts/idcard-spec.test.ts).
 */

// ---------------------------------------------------------------------------
// Canvas (§0, §3)
// ---------------------------------------------------------------------------
export const CARD_W = 1011;
export const CARD_H = 638;
export const CARD_RADIUS = 38;

/** ISO/IEC 7810 ID-1 (CR80) page size, in PDF points. */
export const PAGE_W_PT = (85.6 * 72) / 25.4; // 242.646
export const PAGE_H_PT = (54 * 72) / 25.4; // 153.071
/** PDF points per design pixel (§0: 0.24001). */
export const PT_PER_PX = PAGE_W_PT / CARD_W;

// ---------------------------------------------------------------------------
// Colour tokens (§1.1)
// ---------------------------------------------------------------------------
export const COLOR = {
  navy900: "#0A1F44",
  navy700: "#16407A",
  navy600: "#1C4E8F",
  gold500: "#C9A24A",
  gold300: "#E2C275",
  gold700: "#B08A34",
  goldInk: "#8A6A1F",
  paper: "#FBFAF6",
  photoBg: "#DCE3EC",
  placeholder: "#9DAEC4",
  slateInk: "#33415C",
  white: "#FFFFFF",
  barcodeInk: "#0B1B2B",
} as const;

// ---------------------------------------------------------------------------
// Wave-line texture (§4)
// ---------------------------------------------------------------------------
export const WAVE_COUNT = 34;
export const WAVE_STROKE_OPACITY = 0.32;
export const WAVE_STROKE_WIDTH = 1.2;

/** The 34 polylines, each as a list of [x, y] points — generated exactly as
 * the spec's snippet does (y rounded to 1 decimal). */
export function wavePolylines(): [number, number][][] {
  const lines: [number, number][][] = [];
  for (let k = 0; k < WAVE_COUNT; k++) {
    const t = k / (WAVE_COUNT - 1);
    const pts: [number, number][] = [];
    for (let x = 0; x <= CARD_W + 20; x += 20) {
      const u = x / CARD_W;
      const y =
        CARD_H * 0.3 +
        t * CARD_H * 0.62 +
        70 * Math.sin(2 * Math.PI * (u * 1.05 + 0.15) + t * 1.9) * (0.6 + 0.4 * t) +
        30 * Math.sin(2 * Math.PI * u * 2.2 + t * 3);
      pts.push([x, Number(y.toFixed(1))]);
    }
    lines.push(pts);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Header (§5)
// ---------------------------------------------------------------------------
export type PathCmd = ["M", number, number] | ["L", number, number] | ["C", number, number, number, number, number, number] | ["Z"];

/** Header shape: M0 0 H1011 V240 C1011 300 976 328 906 328 H232 C120 328 36 302 0 248 Z */
export const HEADER_PATH: PathCmd[] = [
  ["M", 0, 0],
  ["L", 1011, 0],
  ["L", 1011, 240],
  ["C", 1011, 300, 976, 328, 906, 328],
  ["L", 232, 328],
  ["C", 120, 328, 36, 302, 0, 248],
  ["Z"],
];
/** Gold edge: the same curve, open, without the top edge (§5.3). */
export const HEADER_EDGE_PATH: PathCmd[] = [
  ["M", 0, 248],
  ["C", 36, 302, 120, 328, 232, 328],
  ["L", 906, 328],
  ["C", 976, 328, 1011, 300, 1011, 240],
];
export const HEADER_EDGE_WIDTH = 4;
/** The path's own bounding box — an SVG objectBoundingBox gradient is relative to this. */
export const HEADER_BBOX = { w: 1011, h: 328 };
/** Gradient vector in bounding-box units (x1 y1 x2 y2), and its stops (§5.2). */
export const HEADER_GRADIENT = {
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0.4,
  stops: [
    { offset: 0, color: COLOR.navy600 },
    { offset: 0.45, color: COLOR.navy900 },
    { offset: 1, color: COLOR.navy700 },
  ],
} as const;

/** SVG path-data string for a command list. */
export function pathToD(cmds: PathCmd[]): string {
  return cmds.map((c) => c.join(" ")).join(" ").replace(/^M/, "M");
}

// ---------------------------------------------------------------------------
// Footer (§6)
// ---------------------------------------------------------------------------
export const FOOTER = {
  y: 591,
  h: 47,
  ruleH: 3,
  padX: 56,
  fontSize: 12,
  baseline: 620.5,
  leftX: 56,
  rightX: 955,
} as const;
export const FOOTER_RIGHT_TEXT = "Property of AKIS — if found, return to the school office.";

// ---------------------------------------------------------------------------
// School identity (§7) and title (§8)
// ---------------------------------------------------------------------------
export const CREST = { x: 112, y: 74, w: 56, h: 60, src: "/brand/crest-white-tight.png", file: "crest-white-tight.png" } as const;
export const SCHOOL_NAME = {
  x: 182,
  fontSize: 17,
  lines: [
    // The spec says ≈ 99.6 / 120.6; the reference render snaps these to whole
    // pixels (99 / 120), and drawing at the fractional value sat 1 px low.
    { text: "Al Kamal", baseline: 99 },
    { text: "International Studies", baseline: 120 },
  ],
} as const;
export const TITLE = {
  x: 428,
  fontSize: 76,
  letterSpacing: 1,
  lines: [
    { text: "STUDENT", baseline: 183, color: COLOR.white },
    { text: "ID CARD", baseline: 255, color: COLOR.gold300 },
  ],
} as const;

// ---------------------------------------------------------------------------
// Photo (§9)
// ---------------------------------------------------------------------------
export const PHOTO = {
  cx: 245,
  cy: 323,
  goldR: 136,
  navyR: 124,
  wellR: 118,
  /** object-position y of the cropped photo (x is centred). */
  focusY: 0.3,
  silhouette: { w: 180, h: 200 },
} as const;
export const SILHOUETTE_HEAD = { cx: 90, cy: 70, r: 44 } as const;
export const SILHOUETTE_SHOULDERS: PathCmd[] = [
  ["M", 10, 200],
  ["C", 14, 140, 50, 120, 90, 120],
  ["C", 130, 120, 166, 140, 170, 200],
  ["Z"],
];

// ---------------------------------------------------------------------------
// Data fields (§10)
// ---------------------------------------------------------------------------
export const FIELDS = {
  labelX: 428,
  valueX: 578,
  maxValueRight: 975,
  labelSize: 21,
  valueSize: 21,
  minValueSize: 16,
  baselines: [382, 430, 478, 526],
  labels: ["Name", "Grade / Class", "Student ID", "D.O.B"],
} as const;
export const FIELD_MAX_VALUE_W = FIELDS.maxValueRight - FIELDS.valueX; // 397

// ---------------------------------------------------------------------------
// Barcode (§11)
// ---------------------------------------------------------------------------
export const BARCODE = {
  x: 108,
  y: 494,
  w: 274,
  h: 56,
  textBaseline: 570,
  textSize: 12,
  textLetterSpacing: 2,
  centerX: 245,
} as const;

// ---------------------------------------------------------------------------
// Value formatting (§10.1)
// ---------------------------------------------------------------------------
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** `13 June 2020` — full English month, no leading zero on the day. */
export function formatDob(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "—";
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return "—";
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/**
 * The portal stores a class as name "Primary Stage 1 | Grade 1" + section "A".
 * The card shows `Primary 1 · Grade 1 - A`: the word "Stage" is dropped, the
 * parts are joined with a middle dot, and the section follows after " - ".
 * A name without a stage part ("Grade 6") gives `Grade 6 - A`.
 */
export function formatClassLabel(className: string | null | undefined, section: string | null | undefined): string {
  const name = (className ?? "").trim();
  if (!name) return "Not assigned";
  const parts = name
    .split("|")
    .map((p) => p.replace(/\bStage\b/gi, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const body = parts.join(" · ");
  const sec = (section ?? "").trim();
  return sec ? `${body} - ${sec}` : body;
}

/** `2025-2026` or `2026-27` → `2025–26` / `2026–27` (en dash, two-digit end year). */
export function formatAcademicYear(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  const m = /^(\d{4})\s*[-–—]\s*(\d{2}|\d{4})$/.exec(s);
  if (!m) return s;
  return `${m[1]}–${m[2]!.slice(-2)}`;
}

/** Characters we can't draw become "?" rather than a missing-glyph box. */
export function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
