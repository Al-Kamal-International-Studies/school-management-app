#!/usr/bin/env node
// Rasterizes public/brand/aket-seal.svg to public/brand/aket-seal.png —
// a square, transparent-background PNG that pdf-lib (which cannot embed
// SVG directly) can embed in the admissions PDF header, mirroring AKIS's
// existing PNG crest assets (crest-navy.png etc).
//
// Usage: node scripts/rasterize-aket-logo.mjs
//
// Uses `sharp` (already present in node_modules as a transitive dependency
// of `next`'s image optimizer, so no extra install was needed here — if
// that ever stops being true, `npm install --no-save --save-dev sharp`
// before rerunning).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcSvg = path.join(repoRoot, "public", "brand", "aket-seal.svg");
const outPng = path.join(repoRoot, "public", "brand", "aket-seal.png");

const SIZE = 1024; // square, well above the 512x512 minimum, for crisp embedding at any PDF logo size

async function main() {
  const svg = await readFile(srcSvg);
  await sharp(svg, { density: 384 }) // supersample the 200x200 viewBox before downscaling for clean edges
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPng);

  console.log(`Wrote ${path.relative(repoRoot, outPng)} (${SIZE}x${SIZE}, transparent background)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
