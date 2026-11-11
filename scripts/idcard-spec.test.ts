// Checks the pure parts of the student ID card (src/lib/idcard/layout.ts and
// code128.ts) against the "AKIS Student ID Card — Pixel Specification":
// value formatting (§10.1), the wave texture (§4), the Code 128B barcode (§11)
// and the header/photo geometry. Run after any change to those files:
//   node scripts/idcard-spec.test.ts
import {
  BARCODE,
  CARD_H,
  CARD_W,
  FIELDS,
  HEADER_PATH,
  PAGE_H_PT,
  PAGE_W_PT,
  PHOTO,
  PT_PER_PX,
  formatAcademicYear,
  formatClassLabel,
  formatDob,
  pathToD,
  wavePolylines,
} from "../src/lib/idcard/layout.ts";
import { barRuns, code128BModules } from "../src/lib/idcard/code128.ts";

let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    fail++;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

// §10.1 formatting
check("dob full month, no leading zero", formatDob("2020-06-13"), "13 June 2020");
check("dob single-digit day", formatDob("2019-03-05"), "5 March 2019");
check("dob timestamp suffix", formatDob("2019-03-05T00:00:00Z"), "5 March 2019");
check("dob missing", formatDob(null), "—");
check("dob garbage", formatDob("not a date"), "—");
check("class: stage | grade + section", formatClassLabel("Primary Stage 1 | Grade 1", "A"), "Primary 1 · Grade 1 - A");
check("class: KG stage", formatClassLabel("KG Stage 2 | Grade 2", "B"), "KG 2 · Grade 2 - B");
check("class: grade only", formatClassLabel("Grade 6", "A"), "Grade 6 - A");
check("class: stage only", formatClassLabel("KG Stage 2", "A"), "KG 2 - A");
check("class: unassigned", formatClassLabel(null, null), "Not assigned");
check("year: two full years", formatAcademicYear("2026-2027"), "2026–27");
check("year: short end", formatAcademicYear("2026-27"), "2026–27");
check("year: already en dash", formatAcademicYear("2026–27"), "2026–27");
check("year: single year untouched", formatAcademicYear("2026"), "2026");

// §4 waves: 34 polylines, x = 0, 20 … 1020 (52 points)
const waves = wavePolylines();
check("wave count", waves.length, 34);
check("wave points", waves[0]!.length, 52);
check("wave x range", [waves[0]![0]![0], waves[0]![51]![0]], [0, 1020]);
// k = 0, x = 0: 638·0.30 + 70·sin(2π·0.15)·0.6 + 30·sin(0) = 191.4 + 33.98
check("wave first point", waves[0]![0], [0, 225.4]);

// §11 barcode: 14-char ID = start + 14 + checksum (16 symbols × 11) + 13-module stop = 189
const modules = code128BModules("AKIS-2026-0029");
check("barcode modules", modules.length, 189);
check("barcode starts with Start B", modules.slice(0, 11), "11010010000");
check("barcode ends with Stop", modules.slice(-13), "1100011101011");
check(
  "barcode known answer (matches JsBarcode CODE128B)",
  modules,
  "110100100001010001100010110001110110001000101101110100010011011100110011100101001110110011001110010110011101001001101110010011101100100111011001100111001011100101100101111000101100011101011",
);
check("barcode runs cover every bar module", barRuns(modules).reduce((n, r) => n + r.width, 0), [...modules].filter((c) => c === "1").length);
let threw = false;
try {
  code128BModules("AKIS-é");
} catch {
  threw = true;
}
check("barcode rejects non-ASCII", threw, true);

// Geometry
check("header path", pathToD(HEADER_PATH), "M 0 0 L 1011 0 L 1011 240 C 1011 300 976 328 906 328 L 232 328 C 120 328 36 302 0 248 Z");
check("photo centre", [PHOTO.cx, PHOTO.cy], [245, 323]);
check("photo ring widths (gold, navy)", [PHOTO.goldR - PHOTO.navyR, PHOTO.navyR - PHOTO.wellR], [12, 6]);
check("barcode centre = photo centre", BARCODE.x + BARCODE.w / 2, PHOTO.cx);
check("field baselines", FIELDS.baselines, [382, 430, 478, 526]);
check("canvas", [CARD_W, CARD_H], [1011, 638]);
check("page is CR80 (mm, 1 dp)", [Math.round((PAGE_W_PT * 25.4) / 72 * 10) / 10, Math.round((PAGE_H_PT * 25.4) / 72 * 10) / 10], [85.6, 54]);
check("pt per px ≈ 0.24001", Math.round(PT_PER_PX * 100000) / 100000, 0.24001);

if (fail) {
  console.error(`\n${fail} check(s) failed`);
  process.exit(1);
}
console.log("idcard spec checks: all passed");
