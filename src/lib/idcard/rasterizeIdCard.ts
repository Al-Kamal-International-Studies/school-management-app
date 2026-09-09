import "server-only";

import * as mupdf from "mupdf";

/**
 * Renders page 1 of a (single-page) PDF to a PNG — used to give the ID
 * card a genuine "Save as Image" download alongside the PDF one (Muhammad,
 * chat, 2026-09-09: downloading the PDF on his phone just opened it in the
 * browser's own viewer instead of saving anywhere, and he asked for a real
 * "save to Photos/Gallery"-style option). Rasterizing the SAME PDF bytes
 * generateIdCardPdf() already produces — rather than maintaining a second,
 * canvas-based drawing routine — guarantees the PNG can never visually
 * drift from the PDF the way the PDF and the on-page preview once did (see
 * layout.ts's own doc comment for that history).
 *
 * mupdf is pure WASM (no native bindings to compile), so this runs fine in
 * Vercel's Node.js serverless runtime — confirmed against the installed
 * package's own dist/mupdf.d.ts rather than assumed, per AGENTS.md's
 * "check the actual docs" instruction (that instruction is about Next.js
 * specifically, but the same discipline applies to any unfamiliar API).
 *
 * scale=4 on a 243x153pt (CR80) page renders at 972x612px — roughly
 * 288ppi, well above typical phone-screen/photo-app viewing density
 * without producing a needlessly large file.
 */
export async function rasterizeIdCardPng(pdfBytes: Uint8Array, scale = 4): Promise<Uint8Array> {
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const page = doc.loadPage(0);
  const matrix = mupdf.Matrix.scale(scale, scale);
  // alpha=false — the card has no transparent regions by design (a real ID
  // card isn't meant to be composited over anything), and this renders
  // unpainted page area as opaque white, matching how every PDF viewer
  // already displays it.
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
  return pixmap.asPNG();
}
