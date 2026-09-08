import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { PALETTE, wrapText } from "@/lib/admissions/generatePdf";
import { knownCenterFor } from "@/lib/centers/knownCenters";
import { AKIS_CENTER_ID, AKET_CENTER_ID } from "@/lib/types/database.types";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  PADDING,
  HEADER_HEIGHT,
  HEADER_ACCENT_HEIGHT,
  PHOTO_WIDTH,
  PHOTO_HEIGHT,
  PHOTO_Y,
  CONTENT_TOP,
  CONTENT_BOTTOM,
  DETAILS_X,
  DETAILS_WIDTH,
  FOOTER_RULE_Y,
  FOOTER_TEXT_Y,
} from "./layout";
import type { IdCardData } from "./getIdCardData";

/**
 * A genuine, printable school ID card — sized to the real CR80 standard
 * (see layout.ts) rather than a normal document page, so it can be printed
 * 1:1 onto real card stock and not just viewed as a PDF. Landscape.
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
 *
 * Every structural measurement (card size, header height, photo box,
 * details column) comes from layout.ts, shared with
 * components/idcard/IdCardView.tsx's on-page preview — see that file's own
 * doc comment for why (Muhammad, chat, 2026-09-09: the downloaded PDF
 * didn't match the app's preview).
 */

const WHITE = rgb(1, 1, 1);
const INK = rgb(0.1, 0.11, 0.14);
const MUTED = rgb(0.42, 0.44, 0.48);

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

  async function loadBrandPng(file: string): Promise<PDFImage | null> {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", "brand", file));
      return await doc.embedPng(bytes);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // Header band
  // ---------------------------------------------------------------------
  page.drawRectangle({ x: 0, y: CARD_HEIGHT - HEADER_HEIGHT, width: CARD_WIDTH, height: HEADER_HEIGHT, color: palette.primary900 });
  page.drawRectangle({
    x: 0,
    y: CARD_HEIGHT - HEADER_HEIGHT - HEADER_ACCENT_HEIGHT,
    width: CARD_WIDTH,
    height: HEADER_ACCENT_HEIGHT,
    color: palette.accent500,
  });

  const headerLogoFile = data.center === "akis" ? "crest-white.png" : "aket-seal.png";
  const headerLogo = await loadBrandPng(headerLogoFile);

  let textX = PADDING;
  if (headerLogo) {
    const logoSize = 20;
    const scale = logoSize / headerLogo.height;
    const logoWidth = headerLogo.width * scale;
    page.drawImage(headerLogo, { x: PADDING, y: CARD_HEIGHT - HEADER_HEIGHT / 2 - logoSize / 2, width: logoWidth, height: logoSize });
    textX = PADDING + logoWidth + 6;
  }

  page.drawText(schoolName, {
    x: textX,
    y: CARD_HEIGHT - HEADER_HEIGHT / 2 + 3,
    size: 7.5,
    font: serifBold,
    color: WHITE,
    maxWidth: CARD_WIDTH - textX - PADDING,
  });
  page.drawText("STUDENT ID CARD", {
    x: textX,
    y: CARD_HEIGHT - HEADER_HEIGHT / 2 - 8,
    size: 5.5,
    font: bold,
    color: palette.onBandSubtitle,
  });

  // ---------------------------------------------------------------------
  // Photo — a standard international passport-photo ratio (35:45mm),
  // sized well short of the full content height and vertically centered
  // within it (see layout.ts's own comment: an earlier version spanned
  // the full height edge-to-edge and was reported as too large; the
  // centered margin above/below now reads as intentional framing rather
  // than the original bug, which was a photo that stopped abruptly
  // partway down with a lopsided gap only at the bottom). Every photo
  // uploaded through this app's own upload flow (IdCardPhotoUpload.tsx)
  // is a square 512×512 PNG, so "contain" fit inside this taller box
  // still centers cleanly with no cropping needed.
  // ---------------------------------------------------------------------
  page.drawRectangle({
    x: PADDING,
    y: PHOTO_Y,
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderWidth: 1.25,
    borderColor: palette.primary700,
    color: rgb(0.96, 0.96, 0.97),
  });
  // A thin accent-colored divider between the photo and the details
  // column — a small structural flourish, not just a plain gap. Matches
  // the photo's own (centered, shorter-than-full) height, not the full
  // content height, so it visually corresponds to the photo box itself.
  page.drawRectangle({ x: PADDING + PHOTO_WIDTH + 4, y: PHOTO_Y, width: 1.5, height: PHOTO_HEIGHT, color: palette.accent500 });

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
    const scale = Math.min(PHOTO_WIDTH / embeddedPhoto.width, PHOTO_HEIGHT / embeddedPhoto.height);
    const w = embeddedPhoto.width * scale;
    const h = embeddedPhoto.height * scale;
    page.drawImage(embeddedPhoto, { x: PADDING + (PHOTO_WIDTH - w) / 2, y: PHOTO_Y + (PHOTO_HEIGHT - h) / 2, width: w, height: h });
  } else {
    const label = initialsOf(data.fullName) || "?";
    const size = 18;
    const textWidth = bold.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: PADDING + (PHOTO_WIDTH - textWidth) / 2,
      y: PHOTO_Y + PHOTO_HEIGHT / 2 - size / 3,
      size,
      font: bold,
      color: palette.primary700,
    });
  }

  // ---------------------------------------------------------------------
  // Details column, right of the photo — spread across the SAME content
  // height the photo now spans, with larger type than before so it
  // actually fills the space rather than clustering at the top (the
  // other half of Muhammad's feedback: "a lot of empty space on the right
  // hand side").
  // ---------------------------------------------------------------------
  // A deliberate gap below the header band before the name starts — it
  // used to sit right up against the header, reported as too close.
  let y = CONTENT_TOP - 16;

  // The name is the one field genuinely long enough in real data to wrap
  // (e.g. "Khushi Abdul Rahim Gopang Abdul Rahim Gopang" — a real student
  // in this school) — a *fixed* height reservation for it, as this used
  // to have, silently overflowed into "GRADE / CLASS" whenever a name
  // wrapped to 3 lines instead of the assumed 2. Fixed by shrinking the
  // font (12pt down to 9pt) until it fits within 2 lines, and reserving
  // exactly as much height as the chosen size's ACTUAL line count needs —
  // never a guess. This is the real cause of Muhammad's "lettering out of
  // place... a total mess" report (chat, 2026-09-09): confirmed live by
  // rendering a long real name and watching it overlap the field below.
  const NAME_LINE_HEIGHT = 11;
  const nameSizes = [10, 9.5, 9, 8];
  let nameLines = wrapText(data.fullName, bold, nameSizes[nameSizes.length - 1]!, DETAILS_WIDTH);
  let nameSize = nameSizes[nameSizes.length - 1]!;
  for (const trySize of nameSizes) {
    const lines = wrapText(data.fullName, bold, trySize, DETAILS_WIDTH);
    if (lines.length <= 2) {
      nameSize = trySize;
      nameLines = lines;
      break;
    }
  }
  // Never more than 2 lines even in the pathological case the smallest
  // tried size still wraps further — better to show the first two lines
  // of a genuinely extreme name than to keep shrinking indefinitely.
  nameLines = nameLines.slice(0, 2);
  for (const line of nameLines) {
    page.drawText(line, { x: DETAILS_X, y, size: nameSize, font: bold, color: INK });
    y -= NAME_LINE_HEIGHT;
  }
  y -= 3; // a little breathing room before the fields start

  // The 3 fields below then split whatever height is ACTUALLY left (not a
  // fixed guess either) — a 2-line name leaves less room than a 1-line
  // one, so the field rows compress slightly rather than running past
  // CONTENT_BOTTOM into the footer, which is exactly what happened before
  // this fix: a 2-line name pushed "DATE OF BIRTH" down far enough to
  // collide with the footer rule and its "Property of the school" text.
  const fieldRowHeight = (y - CONTENT_BOTTOM) / 3;
  const labelOffset = Math.min(6, fieldRowHeight * 0.28);
  const valueOffset = Math.min(17, fieldRowHeight * 0.72);

  function field(label: string, value: string) {
    const rowTop = y;
    page.drawText(label, { x: DETAILS_X, y: rowTop - labelOffset, size: 5.5, font: bold, color: palette.accent700 });
    page.drawText(value, { x: DETAILS_X, y: rowTop - valueOffset, size: 8.5, font: bold, color: INK, maxWidth: DETAILS_WIDTH });
    y -= fieldRowHeight;
  }

  field("GRADE / CLASS", data.className ?? "Not assigned");
  field("STUDENT ID", data.enrollmentNumber);
  field("DATE OF BIRTH", formatDob(data.dateOfBirth));

  // ---------------------------------------------------------------------
  // Footer — thin rule + academic year + a standard "property of" line,
  // same real-ID-card convention the admission PDF's own footer borrows
  // from (generatePdf.ts's drawFooters).
  // ---------------------------------------------------------------------
  page.drawRectangle({ x: PADDING, y: FOOTER_RULE_Y, width: CARD_WIDTH - PADDING * 2, height: 0.75, color: rgb(0.85, 0.85, 0.87) });
  const footerText = `${centerLabel} · Academic Year ${data.academicYear}`;
  page.drawText(footerText, { x: PADDING, y: FOOTER_TEXT_Y, size: 5.5, font, color: MUTED });
  const propertyText = "Property of the school — if found, return to the office.";
  const propertyWidth = font.widthOfTextAtSize(propertyText, 5);
  page.drawText(propertyText, { x: CARD_WIDTH - PADDING - propertyWidth, y: FOOTER_TEXT_Y, size: 5, font, color: MUTED });

  return doc.save();
}
