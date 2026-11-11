import "server-only";

import type { Font } from "@pdf-lib/fontkit";
import { barRuns, code128BModules } from "./code128";
import { RLM, drawable, loadIdCardFonts, mixedWidth, textWidth } from "./fonts";
import {
  BARCODE,
  FIELDS,
  FIELD_MAX_VALUE_W,
  FOOTER,
  FOOTER_RIGHT_TEXT,
  collapseSpaces,
  formatAcademicYear,
  formatClassLabel,
  formatDob,
} from "./layout";
import type { IdCardData } from "./getIdCardData";

/**
 * Everything the card needs, already formatted, sanitized and measured — the
 * one object both renderers (IdCardGraphic's SVG and generateIdCard's PDF)
 * draw from, so the screen and the download cannot disagree about a
 * truncated name, a shrunk font size or where right-aligned text starts.
 */
export interface IdCardModel {
  /** Rows 1-4 of the data block (spec §10): fixed label, `: value`, fitted size. */
  fields: { label: string; value: string; fontSize: number; baseline: number }[];
  /** Footer, left: `Academic Year 2026–27`. */
  footerLeft: string;
  /** Footer, right-aligned to x 955: text and the x its left edge starts at. */
  footerRight: { text: string; x: number };
  /** Barcode bar runs in module units, and the total module count (null: ID not encodable). */
  barcode: { runs: { start: number; width: number }[]; modules: number } | null;
  /** Human-readable ID under the barcode, with the x its left edge starts at. */
  barcodeText: { text: string; x: number };
  /** PDF metadata title (spec §0). */
  pdfTitle: string;
}

/** Shrink the value 1 px at a time down to the minimum, then truncate with an
 * ellipsis — never wrap (spec §10.2). */
function fitValue(latin: Font, arabic: Font, text: string): { text: string; fontSize: number } {
  for (let size = FIELDS.valueSize; size >= FIELDS.minValueSize; size--) {
    if (mixedWidth(latin, arabic, text, size) <= FIELD_MAX_VALUE_W) return { text, fontSize: size };
  }
  const size = FIELDS.minValueSize;
  const chars = Array.from(text);
  // After Arabic text the "…" is followed by an RLM so it belongs to the Arabic
  // run and lands at the end of the name (its left edge) rather than before it.
  const withEllipsis = () => {
    const kept = chars.join("").trimEnd();
    const last = Array.from(kept).pop()!.codePointAt(0)!;
    const endsInArabic = !latin.hasGlyphForCodePoint(last) && arabic.hasGlyphForCodePoint(last);
    return kept + "…" + (endsInArabic ? RLM : "");
  };
  while (chars.length > 2 && mixedWidth(latin, arabic, withEllipsis(), size) > FIELD_MAX_VALUE_W) chars.pop();
  return { text: withEllipsis(), fontSize: size };
}

export async function buildIdCardModel(data: IdCardData): Promise<IdCardModel> {
  const fonts = await loadIdCardFonts();
  const sans600 = fonts.sans600.font;
  const sans500 = fonts.sans500.font;
  const arabic = fonts.arabic600.font;

  const fullName = drawable(sans600, arabic, collapseSpaces(data.fullName)) || "—";
  const studentId = drawable(sans600, arabic, collapseSpaces(data.enrollmentNumber)) || "—";
  const classLabel = drawable(sans600, arabic, formatClassLabel(data.className, data.section));
  const dob = formatDob(data.dateOfBirth);

  const values = [fullName, classLabel, studentId, dob].map((v) => `: ${v}`);
  const fields = FIELDS.labels.map((label, i) => {
    const fitted = fitValue(sans600, arabic, values[i]!);
    return { label, value: fitted.text, fontSize: fitted.fontSize, baseline: FIELDS.baselines[i]! };
  });

  const footerLeft = `Academic Year ${drawable(sans500, null, formatAcademicYear(data.academicYear))}`;
  const footerRight = {
    text: FOOTER_RIGHT_TEXT,
    x: FOOTER.rightX - textWidth(sans500, FOOTER_RIGHT_TEXT, FOOTER.fontSize),
  };

  let barcode: IdCardModel["barcode"] = null;
  try {
    const modules = code128BModules(data.enrollmentNumber.trim());
    barcode = { runs: barRuns(modules), modules: modules.length };
  } catch {
    barcode = null; // an ID with characters Code 128B can't carry: print the number only
  }

  // Centered on the barcode box the way CSS centres letter-spaced text: the
  // trailing letter-space counts toward the width.
  const idWidth = textWidth(sans600, studentId, BARCODE.textSize, BARCODE.textLetterSpacing);
  const barcodeText = { text: studentId, x: BARCODE.centerX - idWidth / 2 };

  return {
    fields,
    footerLeft,
    footerRight,
    barcode,
    barcodeText,
    pdfTitle: `${fullName} — Student ID — ${studentId}`,
  };
}
