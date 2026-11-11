import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  fill,
  setFillingColor,
  PDFOperator,
  PDFRef,
  appendBezierCurve,
  clip,
  closePath,
  concatTransformationMatrix,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import type { Font } from "@pdf-lib/fontkit";
import { buildIdCardModel, type IdCardModel } from "./cardModel";
import { loadIdCardFonts, splitRuns } from "./fonts";
import {
  BARCODE,
  CARD_H,
  CARD_RADIUS,
  CARD_W,
  COLOR,
  CREST,
  FIELDS,
  FOOTER,
  HEADER_BBOX,
  HEADER_EDGE_PATH,
  HEADER_EDGE_WIDTH,
  HEADER_GRADIENT,
  HEADER_PATH,
  PAGE_H_PT,
  PAGE_W_PT,
  PHOTO,
  PT_PER_PX,
  SCHOOL_NAME,
  SILHOUETTE_HEAD,
  SILHOUETTE_SHOULDERS,
  TITLE,
  WAVE_STROKE_OPACITY,
  WAVE_STROKE_WIDTH,
  pathToD,
  wavePolylines,
  type PathCmd,
} from "./layout";
import type { IdCardData } from "./getIdCardData";

/**
 * The student ID card as a one-page, vector PDF sized to a real CR80 card
 * (85.6 × 54 mm, landscape) — "Design B: Navy & Gold", implemented from
 * AKIS_Student_ID_Card_Spec.md. Every coordinate is the spec's design pixel
 * (layout.ts) multiplied by PT_PER_PX with y flipped, text is positioned by
 * the spec's baselines, and the page is clipped to the 38 px rounded card
 * outline so the corners stay unpainted.
 *
 * Generated fresh on every request, never stored: an ID card must always
 * show the student's CURRENT name, class and photo, and a stored copy would
 * go stale on every profile edit (see the route handler in
 * app/api/id-card/[studentId]/route.ts). The PNG download and the live
 * on-page card (components/idcard/IdCardGraphic.tsx) draw from the same
 * layout.ts + cardModel.ts, so the three cannot drift apart.
 */

export interface IdCardPhoto {
  bytes: Uint8Array;
  format: "png" | "jpg";
}

// -- px → pt ------------------------------------------------------------------
const X = (px: number) => px * PT_PER_PX;
const Y = (px: number) => PAGE_H_PT - px * PT_PER_PX;

function hex(color: string): Color {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// -- path / clip helpers --------------------------------------------------------
function pathOps(cmds: PathCmd[]): PDFOperator[] {
  return cmds.map((c) => {
    switch (c[0]) {
      case "M":
        return moveTo(X(c[1]), Y(c[2]));
      case "L":
        return lineTo(X(c[1]), Y(c[2]));
      case "C":
        return appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]));
      case "Z":
        return closePath();
    }
  });
}

const KAPPA = 0.5522847498;
function circleCmds(cx: number, cy: number, r: number): PathCmd[] {
  const k = r * KAPPA;
  return [
    ["M", cx + r, cy],
    ["C", cx + r, cy + k, cx + k, cy + r, cx, cy + r],
    ["C", cx - k, cy + r, cx - r, cy + k, cx - r, cy],
    ["C", cx - r, cy - k, cx - k, cy - r, cx, cy - r],
    ["C", cx + k, cy - r, cx + r, cy - k, cx + r, cy],
    ["Z"],
  ];
}

function roundedCardCmds(): PathCmd[] {
  const r = CARD_RADIUS;
  const k = r * KAPPA;
  const W = CARD_W;
  const H = CARD_H;
  return [
    ["M", r, 0],
    ["L", W - r, 0],
    ["C", W - r + k, 0, W, r - k, W, r],
    ["L", W, H - r],
    ["C", W, H - r + k, W - r + k, H, W - r, H],
    ["L", r, H],
    ["C", r - k, H, 0, H - r + k, 0, H - r],
    ["L", 0, r],
    ["C", 0, r - k, r - k, 0, r, 0],
    ["Z"],
  ];
}

/** Run `draw` with the clip path `cmds` active. */
function clipped(page: PDFPage, cmds: PathCmd[], draw: () => void) {
  page.pushOperators(pushGraphicsState(), ...pathOps(cmds), clip(), endPath());
  draw();
  page.pushOperators(popGraphicsState());
}

// -- axial gradients (the PDF equivalent of SVG linearGradient) --------------------
type Stop = { offset: number; color: string };

function rgbArray(color: string): number[] {
  const c = hex(color) as unknown as { red: number; green: number; blue: number };
  return [c.red, c.green, c.blue];
}

function axialShading(doc: PDFDocument, coords: [number, number, number, number], stops: readonly Stop[]): PDFRef {
  const ctx = doc.context;
  const pieces = [];
  for (let i = 0; i < stops.length - 1; i++) {
    pieces.push(ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: rgbArray(stops[i]!.color), C1: rgbArray(stops[i + 1]!.color), N: 1 }));
  }
  const fn =
    pieces.length === 1
      ? pieces[0]!
      : ctx.obj({
          FunctionType: 3,
          Domain: [0, 1],
          Functions: pieces,
          Bounds: stops.slice(1, -1).map((s) => s.offset),
          Encode: pieces.flatMap(() => [0, 1]),
        });
  return ctx.register(ctx.obj({ ShadingType: 2, ColorSpace: "DeviceRGB", Coords: coords, Function: fn, Extend: [true, true] }));
}

// -- text ------------------------------------------------------------------------
/** A font as the PDF needs it: the embedded font plus its fontkit metrics. */
interface Face {
  pdf: PDFFont;
  metrics: Font;
}

/** The outline commands of a fontkit glyph path (the typings don't list them). */
type PathCommand = { command: "moveTo" | "lineTo" | "quadraticCurveTo" | "bezierCurveTo" | "closePath"; args: number[] };

/**
 * Fill one glyph outline. `ox, oy` is the glyph origin on the page in points
 * and `k` the points per font unit; font coordinates run y-up, like PDF.
 */
function fillGlyph(page: PDFPage, commands: PathCommand[], ox: number, oy: number, k: number, color: string) {
  const ops: PDFOperator[] = [pushGraphicsState(), setFillingColor(hex(color))];
  let cx = 0;
  let cy = 0;
  for (const { command, args } of commands) {
    if (command === "moveTo") {
      ops.push(moveTo(ox + args[0]! * k, oy + args[1]! * k));
      [cx, cy] = [args[0]!, args[1]!];
    } else if (command === "lineTo") {
      ops.push(lineTo(ox + args[0]! * k, oy + args[1]! * k));
      [cx, cy] = [args[0]!, args[1]!];
    } else if (command === "quadraticCurveTo") {
      // PDF has only cubic curves: raise the quadratic (control q, end e) to a cubic.
      const [qx, qy, ex, ey] = args as [number, number, number, number];
      ops.push(
        appendBezierCurve(
          ox + (cx + (2 / 3) * (qx - cx)) * k,
          oy + (cy + (2 / 3) * (qy - cy)) * k,
          ox + (ex + (2 / 3) * (qx - ex)) * k,
          oy + (ey + (2 / 3) * (qy - ey)) * k,
          ox + ex * k,
          oy + ey * k,
        ),
      );
      [cx, cy] = [ex, ey];
    } else if (command === "bezierCurveTo") {
      const [x1, y1, x2, y2, ex, ey] = args as [number, number, number, number, number, number];
      ops.push(appendBezierCurve(ox + x1 * k, oy + y1 * k, ox + x2 * k, oy + y2 * k, ox + ex * k, oy + ey * k));
      [cx, cy] = [ex, ey];
    } else {
      ops.push(closePath());
    }
  }
  ops.push(fill(), popGraphicsState());
  page.pushOperators(...ops);
}

/**
 * One line of text. Latin text is drawn glyph by glyph, advancing by the
 * font's own kerned advances plus CSS-style letter-spacing — pdf-lib's
 * drawText lays a whole string out WITHOUT kerning, which makes it ~0.5%
 * wider than the browser draws the same font.
 *
 * Arabic runs (when an Arabic font is given) are shaped by fontkit — joined
 * letter forms, in visual left-to-right order, so the run reads right to left
 * inside the left-to-right line — and drawn as filled vector outlines. pdf-lib's
 * own font embedding can't be used for them: its subsetter drops composite
 * glyphs (the hamza on أ, initial forms) and its width table only knows
 * glyphs that have a character code, which breaks the spacing of joined
 * letters. The cost is that Arabic text in the PDF is not selectable.
 */
function drawRun(page: PDFPage, text: string, xPx: number, baselinePx: number, sizePx: number, face: Face, color: string, letterSpacing = 0, arabic?: Font) {
  let x = xPx;
  for (const part of splitRuns(text, face.metrics, arabic ?? null)) {
    if (part.face === "arabic" && arabic) {
      const run = arabic.layout(part.text);
      const k = (sizePx * PT_PER_PX) / arabic.unitsPerEm;
      let pen = 0; // font units
      run.glyphs.forEach((glyph, i) => {
        const pos = run.positions[i]!;
        const commands = (glyph.path as unknown as { commands: PathCommand[] }).commands;
        fillGlyph(page, commands, X(x) + (pen + pos.xOffset) * k, Y(baselinePx) + pos.yOffset * k, k, color);
        pen += pos.xAdvance;
      });
      x += (run.advanceWidth * sizePx) / arabic.unitsPerEm;
      continue;
    }
    const chars = Array.from(part.text);
    const run = face.metrics.layout(part.text);
    const sameCount = run.positions.length === chars.length; // false only if a ligature merged glyphs
    chars.forEach((ch, i) => {
      if (ch !== " ") page.drawText(ch, { x: X(x), y: Y(baselinePx), size: sizePx * PT_PER_PX, font: face.pdf, color: hex(color) });
      const advance = sameCount ? (run.positions[i]!.xAdvance * sizePx) / face.metrics.unitsPerEm : face.pdf.widthOfTextAtSize(ch, sizePx * PT_PER_PX) / PT_PER_PX;
      x += advance + letterSpacing;
    });
  }
}

async function readBrandPng(file: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(path.join(process.cwd(), "public", "brand", file)));
  } catch {
    return null;
  }
}

export async function generateIdCardPdf(data: IdCardData, photo: IdCardPhoto | null): Promise<Uint8Array> {
  const model = await buildIdCardModel(data);
  const fonts = await loadIdCardFonts();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(model.pdfTitle);
  doc.setSubject("Al Kamal International Studies — student ID card");

  const page = doc.addPage([PAGE_W_PT, PAGE_H_PT]);
  // Subset embedding is required here: it re-encodes the WOFF files as plain TrueType.
  const sans500: Face = { pdf: await doc.embedFont(fonts.sans500.bytes, { subset: true }), metrics: fonts.sans500.font };
  const sans600: Face = { pdf: await doc.embedFont(fonts.sans600.bytes, { subset: true }), metrics: fonts.sans600.font };
  const serif800: Face = { pdf: await doc.embedFont(fonts.serif800.bytes, { subset: true }), metrics: fonts.serif800.font };

  const crestBytes = await readBrandPng(CREST.file);
  const crest = crestBytes ? await doc.embedPng(crestBytes) : null;

  let embeddedPhoto: PDFImage | null = null;
  if (photo) {
    try {
      embeddedPhoto = photo.format === "png" ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
    } catch {
      embeddedPhoto = null; // unreadable bytes: fall back to the silhouette, never fail the download
    }
  }

  const headerShading = axialShading(doc, [HEADER_GRADIENT.x1, HEADER_GRADIENT.y1, HEADER_GRADIENT.x2, HEADER_GRADIENT.y2], HEADER_GRADIENT.stops);
  const ringShading = axialShading(
    doc,
    [PHOTO.cx - PHOTO.goldR, PHOTO.cy - PHOTO.goldR, PHOTO.cx + PHOTO.goldR, PHOTO.cy + PHOTO.goldR],
    [
      { offset: 0, color: COLOR.gold300 },
      { offset: 1, color: COLOR.gold700 },
    ],
  );
  page.node.Resources()!.set(PDFName.of("Shading"), doc.context.obj({ ShHeader: headerShading, ShRing: ringShading }));
  const paintShading = (name: string) => PDFOperator.of("sh" as never, [PDFName.of(name)]);

  // Whole card clipped to the rounded CR80 outline (§3).
  page.pushOperators(pushGraphicsState(), ...pathOps(roundedCardCmds()), clip(), endPath());

  // 1. Paper + wave lines (§3, §4). SVG-style paths: origin top-left, y down.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W_PT, height: PAGE_H_PT, color: hex(COLOR.paper) });
  for (const line of wavePolylines()) {
    const d = "M" + line.map(([x, y]) => `${x} ${y}`).join(" L");
    page.drawSvgPath(d, {
      x: 0,
      y: PAGE_H_PT,
      scale: PT_PER_PX,
      borderColor: hex(COLOR.gold500),
      borderWidth: WAVE_STROKE_WIDTH,
      borderOpacity: WAVE_STROKE_OPACITY,
    });
  }

  // 2. Header: gradient fill, then the 4 px gold edge (§5).
  clipped(page, HEADER_PATH, () => {
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(PT_PER_PX * HEADER_BBOX.w, 0, 0, -PT_PER_PX * HEADER_BBOX.h, 0, PAGE_H_PT),
      paintShading("ShHeader"),
      popGraphicsState(),
    );
  });
  page.drawSvgPath(pathToD(HEADER_EDGE_PATH), {
    x: 0,
    y: PAGE_H_PT,
    scale: PT_PER_PX,
    borderColor: hex(COLOR.gold500),
    borderWidth: HEADER_EDGE_WIDTH,
  });

  // 3. Footer band, gold rule, footer texts (§6).
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W_PT, height: PAGE_H_PT - X(FOOTER.y) , color: hex(COLOR.navy900) });
  page.drawRectangle({ x: 0, y: PAGE_H_PT - X(FOOTER.y + FOOTER.ruleH), width: PAGE_W_PT, height: X(FOOTER.ruleH), color: hex(COLOR.gold500) });
  drawRun(page, model.footerLeft, FOOTER.leftX, FOOTER.baseline, FOOTER.fontSize, sans500, COLOR.white);
  drawRun(page, model.footerRight.text, model.footerRight.x, FOOTER.baseline, FOOTER.fontSize, sans500, COLOR.white);

  // 4. Crest and school name (§7).
  if (crest) {
    const scale = Math.min(CREST.w / crest.width, CREST.h / crest.height);
    const w = crest.width * scale;
    const h = crest.height * scale;
    const x = CREST.x + (CREST.w - w) / 2;
    const y = CREST.y + (CREST.h - h) / 2;
    page.drawImage(crest, { x: X(x), y: Y(y + h), width: X(w), height: X(h) });
  }
  for (const line of SCHOOL_NAME.lines) {
    drawRun(page, line.text, SCHOOL_NAME.x, line.baseline, SCHOOL_NAME.fontSize, sans600, COLOR.white);
  }

  // 5. Title (§8).
  for (const line of TITLE.lines) {
    drawRun(page, line.text, TITLE.x, line.baseline, TITLE.fontSize, serif800, line.color, TITLE.letterSpacing);
  }

  // 6. Photo rings and well (§9).
  clipped(page, circleCmds(PHOTO.cx, PHOTO.cy, PHOTO.goldR), () => {
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(PT_PER_PX, 0, 0, -PT_PER_PX, 0, PAGE_H_PT),
      paintShading("ShRing"),
      popGraphicsState(),
    );
  });
  page.drawCircle({ x: X(PHOTO.cx), y: Y(PHOTO.cy), size: X(PHOTO.navyR), color: hex(COLOR.navy900) });
  page.drawCircle({ x: X(PHOTO.cx), y: Y(PHOTO.cy), size: X(PHOTO.wellR), color: hex(COLOR.photoBg) });

  clipped(page, circleCmds(PHOTO.cx, PHOTO.cy, PHOTO.wellR), () => {
    if (embeddedPhoto) {
      // object-fit: cover, object-position: 50% 30%
      const box = PHOTO.wellR * 2;
      const scale = Math.max(box / embeddedPhoto.width, box / embeddedPhoto.height);
      const w = embeddedPhoto.width * scale;
      const h = embeddedPhoto.height * scale;
      const left = PHOTO.cx - PHOTO.wellR + (box - w) * 0.5;
      const top = PHOTO.cy - PHOTO.wellR + (box - h) * PHOTO.focusY;
      page.drawImage(embeddedPhoto, { x: X(left), y: Y(top + h), width: X(w), height: X(h) });
    } else {
      // No-photo silhouette, bottom-centred in the well (§9.2).
      const ox = PHOTO.cx - PHOTO.silhouette.w / 2;
      const oy = PHOTO.cy + PHOTO.wellR - PHOTO.silhouette.h;
      page.drawCircle({ x: X(ox + SILHOUETTE_HEAD.cx), y: Y(oy + SILHOUETTE_HEAD.cy), size: X(SILHOUETTE_HEAD.r), color: hex(COLOR.placeholder) });
      page.drawSvgPath(pathToD(SILHOUETTE_SHOULDERS), { x: X(ox), y: Y(oy), scale: PT_PER_PX, color: hex(COLOR.placeholder) });
    }
  });

  // 7. Data fields (§10).
  for (const f of model.fields) {
    drawRun(page, f.label, FIELDS.labelX, f.baseline, FIELDS.labelSize, sans600, COLOR.goldInk);
    drawRun(page, f.value, FIELDS.valueX, f.baseline, f.fontSize, sans600, COLOR.navy900, 0, fonts.arabic600.font);
  }

  // 8. Barcode and its human-readable line (§11).
  drawBarcode(page, model);
  drawRun(page, model.barcodeText.text, model.barcodeText.x, BARCODE.textBaseline, BARCODE.textSize, sans600, COLOR.slateInk, BARCODE.textLetterSpacing);

  page.pushOperators(popGraphicsState());
  return doc.save();
}

function drawBarcode(page: PDFPage, model: IdCardModel) {
  if (!model.barcode) return;
  const moduleW = BARCODE.w / model.barcode.modules;
  for (const run of model.barcode.runs) {
    page.drawRectangle({
      x: X(BARCODE.x + run.start * moduleW),
      y: Y(BARCODE.y + BARCODE.h),
      width: X(run.width * moduleW),
      height: X(BARCODE.h),
      color: hex(COLOR.barcodeInk),
    });
  }
}
