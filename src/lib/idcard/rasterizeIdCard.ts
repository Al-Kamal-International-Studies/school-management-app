import "server-only";

import * as mupdf from "mupdf";
import { CARD_H, CARD_W } from "./layout";

/**
 * Renders page 1 of the (single-page) ID card PDF to a PNG — the "Save as
 * Image" download (Muhammad, chat, 2026-09-09: a PDF just opens in a phone
 * browser's viewer instead of saving anywhere, so a real image was asked
 * for). Rasterizing the SAME PDF bytes generateIdCardPdf() produces, rather
 * than keeping a second drawing routine, guarantees the PNG can never
 * drift from the PDF.
 *
 * Output is the spec's design canvas exactly — 1011 × 638 px (CR80 at
 * 300 dpi) — and, per the spec, transparent outside the 38 px rounded
 * corners (the PDF leaves them unpainted). Pass `scale = 2` for a
 * 2022 × 1276 high-DPI copy.
 *
 * mupdf is pure WASM (no native bindings), so this runs in Vercel's Node.js
 * serverless runtime.
 */
export async function rasterizeIdCardPng(pdfBytes: Uint8Array, scale = 1): Promise<Uint8Array> {
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const page = doc.loadPage(0);
  const [x0, y0, x1, y1] = page.getBounds();
  // Scale each axis so the page lands on exactly CARD_W × CARD_H (× scale)
  // whole pixels rather than whatever the float bounds round to.
  const matrix = mupdf.Matrix.scale((CARD_W * scale) / (x1 - x0), (CARD_H * scale) / (y1 - y0));
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true);
  return pixmap.asPNG();
}
