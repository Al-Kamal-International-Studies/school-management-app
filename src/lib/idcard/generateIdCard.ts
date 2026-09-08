import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { PALETTE } from "@/lib/admissions/generatePdf";
import { knownCenterFor } from "@/lib/centers/knownCenters";
import { AKIS_CENTER_ID, AKET_CENTER_ID } from "@/lib/types/database.types";
import type { IdCardData } from "./getIdCardData";

/**
 * A genuine, printable school ID card — sized to the real CR80 standard
 * (the physical size of an actual ID/credit card, 3.375in × 2.125in) rather
 * than a normal document page, so it can be printed 1:1 onto real card
 * stock and not just viewed as a PDF. Landscape.
 *
 * Deliberately generated fresh on every request (see the Route Handler at
 * app/api/id-card/[studentId]/route.ts), never pre-generated and stored
 * the way the admissions PDF is (see generatePdf.ts) — an admission form
 * is an immutable historical snapshot of one submission by design, but an
 * ID card must always reflect the student's CURRENT name/grade/photo. A
 * stored copy would need active invalidation on every profile edit, class
 * reassignment, or photo change to avoid going stale; generating on demand
 * from getIdCardData's live read sidesteps that entirely, at the cost of a
 * (cheap, sub-second) PDF build on every download instead of a Storage
 * fetch.
 */
const CARD_WIDTH = 243; // ~3.375in at 72dpi (CR80 standard ID card width)
const CARD_HEIGHT = 153; // ~2.125in (CR80 standard ID card height)
const MARGIN = 8;
const HEADER_HEIGHT = 30;
const PHOTO_SIZE = 60;

const WHITE = rgb(1, 1, 1);
const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.4, 0.4, 0.44);

export interface IdCardPhoto {
  bytes: Uint8Array;
  format: "png" | "jpg";
}

function formatDob(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export async function generateIdCardPdf(data: IdCardData, photo: IdCardPhoto | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.fullName} — Student ID — ${data.enrollmentNumber}`);

  const page = doc.addPage([CARD_WIDTH, CARD_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const palette = PALETTE[data.center];
  const centerLabel = data.center === "akis" ? "AKIS" : "AKET";
  const centerId = data.center === "akis" ? AKIS_CENTER_ID : AKET_CENTER_ID;
  const schoolName = knownCenterFor(centerId).name;

  // ---------------------------------------------------------------------
  // Header band — center-branded, matches the admission PDF's own header
  // treatment (same PALETTE, same "white crest on AKIS's dark band" fix).
  // ---------------------------------------------------------------------
  page.drawRectangle({ x: 0, y: CARD_HEIGHT - HEADER_HEIGHT, width: CARD_WIDTH, height: HEADER_HEIGHT, color: palette.primary900 });
  page.drawRectangle({ x: 0, y: CARD_HEIGHT - HEADER_HEIGHT - 2, width: CARD_WIDTH, height: 2, color: palette.accent500 });

  const logoFile = data.center === "akis" ? "crest-white.png" : "aket-seal.png";
  let logo: PDFImage | null = null;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "brand", logoFile));
    logo = await doc.embedPng(bytes);
  } catch {
    logo = null;
  }

  let textX = MARGIN;
  if (logo) {
    const logoSize = 20;
    const scale = logoSize / logo.height;
    const logoWidth = logo.width * scale;
    page.drawImage(logo, { x: MARGIN, y: CARD_HEIGHT - HEADER_HEIGHT / 2 - logoSize / 2, width: logoWidth, height: logoSize });
    textX = MARGIN + logoWidth + 6;
  }

  page.drawText(schoolName, {
    x: textX,
    y: CARD_HEIGHT - HEADER_HEIGHT / 2 + 1,
    size: 8,
    font: serifBold,
    color: WHITE,
    maxWidth: CARD_WIDTH - textX - MARGIN,
  });
  page.drawText("STUDENT ID CARD", {
    x: textX,
    y: CARD_HEIGHT - HEADER_HEIGHT / 2 - 9,
    size: 6,
    font: bold,
    color: palette.onBandSubtitle,
  });

  // ---------------------------------------------------------------------
  // Photo — a fixed square box. Every photo uploaded through this app's
  // own upload flow (see IdCardPhotoUpload.tsx) is already square (same
  // 512×512 canvas AvatarCropperModal exports for the general profile
  // avatar), so a plain "fit the box" draw needs no cropping/clip path.
  // ---------------------------------------------------------------------
  const photoY = CARD_HEIGHT - HEADER_HEIGHT - MARGIN - PHOTO_SIZE;
  page.drawRectangle({
    x: MARGIN,
    y: photoY,
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderWidth: 1,
    borderColor: palette.primary700,
    color: rgb(0.95, 0.95, 0.96),
  });

  let embeddedPhoto: PDFImage | null = null;
  if (photo) {
    try {
      embeddedPhoto = photo.format === "png" ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
    } catch {
      // Corrupt/unreadable bytes despite a matching content-type — fall
      // back to the initials placeholder below rather than failing the
      // whole download over one bad image.
      embeddedPhoto = null;
    }
  }

  if (embeddedPhoto) {
    // "Contain" fit within the square box, centered — safe even for an
    // image that ISN'T square (e.g. something set outside this app's own
    // upload flow), just letterboxed instead of cropped.
    const scale = Math.min(PHOTO_SIZE / embeddedPhoto.width, PHOTO_SIZE / embeddedPhoto.height);
    const w = embeddedPhoto.width * scale;
    const h = embeddedPhoto.height * scale;
    page.drawImage(embeddedPhoto, { x: MARGIN + (PHOTO_SIZE - w) / 2, y: photoY + (PHOTO_SIZE - h) / 2, width: w, height: h });
  } else {
    const label = initialsOf(data.fullName) || "?";
    const size = 22;
    const textWidth = bold.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: MARGIN + (PHOTO_SIZE - textWidth) / 2,
      y: photoY + PHOTO_SIZE / 2 - size / 3,
      size,
      font: bold,
      color: palette.primary700,
    });
  }

  // ---------------------------------------------------------------------
  // Details block, right of the photo.
  // ---------------------------------------------------------------------
  const detailsX = MARGIN + PHOTO_SIZE + 10;
  const detailsWidth = CARD_WIDTH - detailsX - MARGIN;
  let y = CARD_HEIGHT - HEADER_HEIGHT - MARGIN - 2;

  page.drawText(data.fullName, { x: detailsX, y, size: 10, font: bold, color: INK, maxWidth: detailsWidth });
  y -= 15;

  function field(label: string, value: string) {
    page.drawText(label, { x: detailsX, y, size: 6, font, color: MUTED });
    y -= 8.5;
    page.drawText(value, { x: detailsX, y, size: 8, font: bold, color: INK, maxWidth: detailsWidth });
    y -= 12.5;
  }

  field("GRADE / CLASS", data.className ?? "Not assigned");
  field("STUDENT ID", data.enrollmentNumber);
  field("DATE OF BIRTH", formatDob(data.dateOfBirth));

  // ---------------------------------------------------------------------
  // Footer — thin accent rule + academic year + a standard "property of"
  // line, same real-ID-card convention the admission PDF's own footer
  // borrows from (generatePdf.ts's drawFooters).
  // ---------------------------------------------------------------------
  page.drawRectangle({ x: MARGIN, y: 16, width: CARD_WIDTH - MARGIN * 2, height: 0.75, color: rgb(0.85, 0.85, 0.87) });
  const footerText = `${centerLabel} · Academic Year ${data.academicYear}`;
  page.drawText(footerText, { x: MARGIN, y: 8, size: 6, font, color: MUTED });
  const propertyText = "Property of the school — if found, return to the office.";
  const propertyWidth = font.widthOfTextAtSize(propertyText, 5.5);
  page.drawText(propertyText, { x: CARD_WIDTH - MARGIN - propertyWidth, y: 8, size: 5.5, font, color: MUTED });

  return doc.save();
}
