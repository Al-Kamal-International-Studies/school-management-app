import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage, type Color } from "pdf-lib";
import type { Admission } from "@/lib/types/database.types";

export type AdmissionRecord = Admission;
export type AdmissionCenter = "akis" | "aket";

// ----------------------------------------------------------------------------
// Verbatim source content (transcribed from the two real paper forms — see
// the feature spec / HANDOVER.md Part 12). Kept as plain data here so the
// layout code below stays generic and center-agnostic.
//
// Scope limitation (deliberate, documented — not an oversight): neither
// form's Arabic payment-policy translation page is reproduced — English
// content only, for both centers.
// ----------------------------------------------------------------------------

const SCHOOL_NAME: Record<AdmissionCenter, string> = {
  akis: "Al Kamal International Studies",
  aket: "Al Kamal Education Technology",
};

const DECLARATION_BULLETS: Record<AdmissionCenter, string[]> = {
  akis: [
    "I hereby apply for admission to the institute for the named student and verify that all the above information is correct and true.",
    "I will be responsible for the student's financial obligation.",
  ],
  aket: [
    "I hereby apply for the admission of the named student to the institute and verify that all the above information is correct and true.",
    "I will be responsible for the student's financial obligation.",
  ],
};

const CONSENT_INTRO = "I hereby acknowledge and agree that:";

const CONSENT_BULLETS: Record<AdmissionCenter, string[]> = {
  akis: [
    "The information provided above regarding my child's health is true and correct.",
    "I will inform the institute immediately if there are any changes to the information provided.",
    "If my child behaves inappropriately (including damaging equipment and being rowdy) they may be excluded from the classes until behavior is deemed appropriate.",
    "If my child is sick (fever, cold, cough, etc.), the Institute has the right not to accept them for the safety of others.",
    "The Institute is a private institution affiliated with CambriLearn Online School. We offer on-campus classes and are not affiliated with or regulated by the Ministry of Education (MOE).",
    "I will not hold Al Kamal International Studies or its employees for any injury, Loss, or damage suffered by my child.",
    "The Institute reserves the right to reject or alter the services at any time.",
    "I give my permission for my child's photograph to be used for promotional and internal purposes.",
    "I give my permission for my child to participate in all water activities included in the Institute's program.",
    "The Institute and its staff are not responsible for the loss of student's personal belongings (jewellery, accessories, etc.)",
  ],
  aket: [
    "The information provided above regarding my child's health is true and correct.",
    "I will inform you immediately if there are any changes to the information provided above.",
    "If my child behaves in an appropriate manner (including damaging equipment being rowdy etc.) they will be excluded from the classes until their behavior is deemed appropriate.",
    "I understand that if my child is sick (fever, cold, cough, etc.), Al Kamal Education Technology have right not to accept the child in the class, for the sake of safety of other students.",
    "I understand that my child will only be given water or drink that are clearly identified as belonging to him.",
    "I will not hold Al Kamal Education Technology, its employees for any injury, Loss or damage suffered to my child.",
    "I understand that Al Kamal Education Technology has reserved the right to reject, alter the services at any time.",
    "I hereby give my permission for my child's picture to be used by Al Kamal Education Technology, for promotional and internal Publications purposes.",
    "I understand that the Al Kamal Education Technology includes activities in or near water. I give my permission for my child to participate in all water activities included in the Al Kamal Education Technology.",
    "I understand that Al Kamal Education Technology and its staff are not responsible for the loss of our Children's Personal Belongings (jewelry, accessories etc.)",
  ],
};

const DISCLAIMER: Record<AdmissionCenter, string> = {
  akis: "In signing this form, I indemnify Al Kamal International Studies, its employees, and its contractors from all legal actions, injury, loss, damage, penalty, or costs arising from my child's attendance at the Institute.",
  aket: "In signing this form, I indemnify Al Kamal Education Technology, its employees and contractors from all legal actions, injury, loss damage, penalty or costs arising from my child's attendance at the Al Kamal Education Technology.",
};

interface PolicySubsection {
  heading: string;
  body?: string;
  bullets?: string[];
}

const PAYMENT_POLICIES: Record<AdmissionCenter, PolicySubsection[]> = {
  akis: [
    { heading: "Accepted Payment Methods", bullets: ["Cash", "Bank Transfer", "Post-Dated Cheques"] },
    {
      heading: "Non-Refundable Deposit Policy",
      body: "By signing this form, I acknowledge and agree that all payments are non-refundable, non-freezable and non-transferable.",
    },
    {
      heading: "Payment Deadline and Penalties",
      body: "All fees must be paid by the 1st of each month. A late fee of AED 150 will be charged for payments received after the due date. Continuous non-payment for two consecutive months may result in termination of enrolment.",
    },
    {
      heading: "Post-Dated Cheque Policy",
      body: "Post-dated cheques will be deposited on the agreed date at registration. Parents are responsible for ensuring sufficient funds are available. Returned/bounced cheques will incur a penalty of AED 500.",
    },
    {
      heading: "Payment Plan Agreement",
      body: "Parents on a payment plan must follow the agreed schedule. Any deviation without prior notice may result in extra charges or cancellation of the plan.",
    },
    {
      heading: "Refund Policy",
      body: "Refunds will only be considered in serious and emergency cases, and must be approved by the Manager. No refunds will be issued for any other reason except in the event of Institute cancellation. All payments are strictly non-refundable, non-transferable, and non-freezable.",
    },
    {
      heading: "Legal Agreement for Payment",
      body: "A legal agreement outlining the payment terms, deadlines, and penalties for late or non-payment must be signed at the time of registration. This agreement serves as a commitment to adhere to the payment schedule.",
    },
    {
      heading: "Early Payment Discount",
      body: "Parents who pay the full annual fee within 10 days of registration will receive a 5% discount.",
    },
  ],
  aket: [
    {
      heading: "Non-Refundable Deposit Policy",
      body: "By signing this form, I acknowledge and agree that all payments are non-refundable, non-freezable and non-transferable.",
    },
    {
      heading: "Payment Deadline and Penalties",
      body: "All fees must be paid by the 1st of each month. A late fee of AED 50 will be charged for payments received after the due date. Continuous non-payment for two consecutive months may result in the termination of the child's enrolment.",
    },
    {
      heading: "Post-Dated Cheque Policy",
      body: "Post-dated cheques will be deposited on the date agreed upon at the time of registration. Parents are responsible for ensuring sufficient funds are available on that date. Bounced cheques will incur a penalty fee of AED 100.",
    },
    {
      heading: "Payment Plan Agreement",
      body: "Parents on a payment plan must follow the agreed schedule. Any deviation without prior notice may result in extra charges or cancellation of the plan.",
    },
    {
      heading: "Legal Agreement for Payment",
      body: "A legal agreement outlining the payment terms, deadlines, and penalties for late or non-payment must be signed at the time of registration. This agreement serves as a commitment to adhere to the payment schedule.",
    },
    {
      heading: "Discounts for Early Payment",
      body: "Parents who pay the full fee within 10 days of registration will receive a 5% discount on the total fee.",
    },
  ],
};

// AKIS only — AKET's source form has no Additional Policies page.
const ADDITIONAL_POLICIES: PolicySubsection[] = [
  {
    heading: "Attendance Policy",
    bullets: [
      "Students are expected to attend all scheduled classes",
      "If a student is absent for more than 3 consecutive days without notification, the Institute reserves the right to contact the parent/guardian and review the student's enrolment.",
      "Missed classes will not be refunded or rescheduled except in cases of documented medical emergencies.",
    ],
  },
  {
    heading: "Code of Conduct",
    bullets: [
      "Students must respect teachers, staff, and fellow classmates.",
      "Disruptive behaviour, vandalism, bullying, or use of foul language will not be tolerated.",
      "The Institute reserves the right to suspend or expel a student for serious misconduct without refund.",
    ],
  },
  {
    heading: "Property Care",
    bullets: [
      "Any damage to Institute property caused by a student will be charged to the parent/guardian.",
      "Students must bring their own stationery and learning material as required by the teacher.",
    ],
  },
  {
    heading: "Safety and Security",
    bullets: [
      "Students must be picked up promptly after class.",
      "For younger students, parent/guardians must ensure the Institute has the correct list of authorized persons for pick-up.",
    ],
  },
  {
    heading: "Use of Technology",
    bullets: [
      "The use of mobile phones in class is not permitted unless approved by the teacher for educational purposes.",
      "Students must not record audio, video, or take photographs during lessons without permission.",
    ],
  },
  {
    heading: "Parent/Guardian Confirmation for Additional Policies",
    body: "I confirm that I have read, understood, and agreed to abide by the Additional Institute Policies listed above.",
  },
];

// ----------------------------------------------------------------------------
// Layout engine — a small, purpose-built helper (not a general PDF library
// wrapper). Just enough to lay out a colored header band, tinted section
// headers, wrapped paragraphs, bullet lists, label+blank fields (filled with
// the submitted value when known), checkbox rows, blank signature lines, and
// a page footer, with automatic pagination.
// ----------------------------------------------------------------------------

const PAGE_WIDTH = 595.28; // A4, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const BLACK = rgb(0.08, 0.08, 0.08);
const GRAY = rgb(0.45, 0.45, 0.45);
const FIELD_LINE = rgb(0.32, 0.32, 0.32);
const FOOTER_GRAY = rgb(0.52, 0.52, 0.52);
const FOOTER_RULE = rgb(0.85, 0.85, 0.85);
const WHITE = rgb(1, 1, 1);

/** Per-center brand palette, sourced verbatim from src/app/globals.css's
 * `:root` (AKIS) and `[data-center="aket"]` (AKET) custom properties. */
interface CenterPalette {
  primary900: Color;
  primary700: Color;
  accent500: Color;
  accent700: Color;
  /** A very light tint of primary900, used for section-header background bands. */
  tint: Color;
  /** A pale, translucent-reading tint of accent500 over the dark header band, for the subtitle. */
  onBandSubtitle: Color;
}

function rgb255(r: number, g: number, b: number): Color {
  return rgb(r / 255, g / 255, b / 255);
}

/** Mixes a brand color into white at `strength` (0-1) to get a light tint
 * suitable as a background band behind dark text. */
function tint(r: number, g: number, b: number, strength: number): Color {
  const mix = (channel: number) => (channel / 255) * strength + (1 - strength);
  return rgb(mix(r), mix(g), mix(b));
}

/** Mixes a brand color into white at `strength` for pale text-on-dark use. */
function paleOn(r: number, g: number, b: number, strength: number): Color {
  const mix = (channel: number) => (channel / 255) * strength + (1 - strength);
  return rgb(mix(r), mix(g), mix(b));
}

const PALETTE: Record<AdmissionCenter, CenterPalette> = {
  akis: {
    primary900: rgb255(15, 33, 49),
    primary700: rgb255(28, 58, 86),
    accent500: rgb255(212, 175, 55),
    accent700: rgb255(148, 107, 10),
    tint: tint(15, 33, 49, 0.07),
    onBandSubtitle: paleOn(212, 175, 55, 0.85),
  },
  aket: {
    primary900: rgb255(3, 40, 44),
    primary700: rgb255(10, 71, 77),
    accent500: rgb255(245, 144, 90),
    accent700: rgb255(217, 109, 44),
    tint: tint(3, 40, 44, 0.07),
    onBandSubtitle: paleOn(245, 144, 90, 0.85),
  },
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

class PdfWriter {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  serifBold: PDFFont;
  center: AdmissionCenter;
  palette: CenterPalette;
  logo: PDFImage | null;
  page!: PDFPage;
  y = 0;

  constructor(
    doc: PDFDocument,
    font: PDFFont,
    bold: PDFFont,
    serifBold: PDFFont,
    center: AdmissionCenter,
    logo: PDFImage | null
  ) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.serifBold = serifBold;
    this.center = center;
    this.palette = PALETTE[center];
    this.logo = logo;
  }

  /** Starts a fresh page. `withHeader` draws the full cover-page header band
   * (crest + school name + form title); other pages get a slim continuity
   * header with the school name and a thin accent rule. */
  newPage(withHeader: boolean) {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;

    if (withHeader) {
      const bandHeight = 112;
      const accentHeight = 4;

      this.page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - bandHeight,
        width: PAGE_WIDTH,
        height: bandHeight,
        color: this.palette.primary900,
      });
      this.page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - bandHeight - accentHeight,
        width: PAGE_WIDTH,
        height: accentHeight,
        color: this.palette.accent500,
      });

      const bandCenterY = PAGE_HEIGHT - bandHeight / 2;
      let textX = MARGIN;

      if (this.logo) {
        const logoHeight = 66;
        const scale = logoHeight / this.logo.height;
        const logoWidth = this.logo.width * scale;
        this.page.drawImage(this.logo, {
          x: MARGIN,
          y: bandCenterY - logoHeight / 2,
          width: logoWidth,
          height: logoHeight,
        });
        textX = MARGIN + logoWidth + 20;
      }

      this.page.drawText(SCHOOL_NAME[this.center], {
        x: textX,
        y: bandCenterY + 6,
        size: 18,
        font: this.serifBold,
        color: WHITE,
      });
      this.page.drawText("STUDENT REGISTRATION FORM", {
        x: textX,
        y: bandCenterY - 16,
        size: 10.5,
        font: this.bold,
        color: this.palette.onBandSubtitle,
      });

      this.y = PAGE_HEIGHT - bandHeight - accentHeight - 30;
    } else {
      // Continuity header on every non-cover page, per the source forms'
      // own letterhead-on-every-page convention.
      this.page.drawText(SCHOOL_NAME[this.center], {
        x: MARGIN,
        y: this.y,
        size: 9,
        font: this.bold,
        color: this.palette.primary700,
      });
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - 8,
        width: CONTENT_WIDTH,
        height: 1.5,
        color: this.palette.accent500,
      });
      this.y -= 28;
    }
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) this.newPage(false);
  }

  sectionHeader(text: string) {
    const size = 13;
    const bandHeight = 27;
    this.ensureSpace(bandHeight + 20);

    const bandTop = this.y + 7;
    const bandBottom = bandTop - bandHeight;
    this.page.drawRectangle({
      x: 0,
      y: bandBottom,
      width: PAGE_WIDTH,
      height: bandHeight,
      color: this.palette.tint,
    });
    this.page.drawText(text, {
      x: MARGIN,
      y: bandBottom + (bandHeight - size) / 2 + 1,
      size,
      font: this.bold,
      color: this.palette.primary900,
    });

    this.y = bandBottom - 5;
    this.page.drawRectangle({ x: MARGIN, y: this.y - 2.5, width: 56, height: 2.5, color: this.palette.accent500 });
    this.y -= 18;
  }

  subsectionHeader(text: string) {
    this.ensureSpace(20);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 11, font: this.bold, color: this.palette.primary700 });
    this.y -= 16;
  }

  paragraph(text: string, opts?: { size?: number; bold?: boolean; color?: Color }) {
    const size = opts?.size ?? 10;
    const font = opts?.bold ? this.bold : this.font;
    const lines = wrapText(text, font, size, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensureSpace(size + 4);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color: opts?.color ?? BLACK });
      this.y -= size + 4;
    }
    this.y -= 4;
  }

  bulletList(items: string[]) {
    const size = 10;
    const indent = 14;
    for (const item of items) {
      const lines = wrapText(item, this.font, size, CONTENT_WIDTH - indent);
      lines.forEach((line, i) => {
        this.ensureSpace(size + 4);
        const prefix = i === 0 ? "•" : "";
        this.page.drawText(prefix, { x: MARGIN, y: this.y, size, font: this.font, color: this.palette.accent700 });
        this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font: this.font, color: BLACK });
        this.y -= size + 4;
      });
    }
    this.y -= 4;
  }

  /** A label with a drawn blank line, filled with `value` when known. */
  field(label: string, value?: string | null, widthFraction = 1) {
    const size = 10;
    this.ensureSpace(28);
    const width = CONTENT_WIDTH * widthFraction;
    this.page.drawText(label, { x: MARGIN, y: this.y, size, font: this.bold, color: BLACK });
    this.y -= 14;
    if (value) {
      this.page.drawText(String(value), { x: MARGIN, y: this.y + 3, size, font: this.font, color: BLACK });
    }
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + width, y: this.y }, thickness: 1, color: FIELD_LINE });
    this.y -= 16;
  }

  /** Several fields laid out side by side on one row. */
  fieldRow(fields: { label: string; value?: string | null }[]) {
    const size = 10;
    this.ensureSpace(28);
    const colWidth = CONTENT_WIDTH / fields.length;
    fields.forEach((f, i) => {
      const x = MARGIN + i * colWidth;
      const width = colWidth - 12;
      this.page.drawText(f.label, { x, y: this.y, size, font: this.bold, color: BLACK });
      if (f.value) {
        this.page.drawText(String(f.value), { x, y: this.y - 15, size, font: this.font, color: BLACK });
      }
      this.page.drawLine({ start: { x, y: this.y - 18 }, end: { x: x + width, y: this.y - 18 }, thickness: 1, color: FIELD_LINE });
    });
    this.y -= 34;
  }

  /** A checkbox + label, several per row, wrapping onto new rows as needed. */
  checkboxRow(items: { label: string; checked: boolean }[]) {
    const size = 9.5;
    const boxSize = 9;
    const gap = 14;
    this.ensureSpace(boxSize + 8);
    let x = MARGIN;
    for (const item of items) {
      const textWidth = this.font.widthOfTextAtSize(item.label, size);
      const itemWidth = boxSize + 4 + textWidth;
      if (x + itemWidth > MARGIN + CONTENT_WIDTH) {
        x = MARGIN;
        this.y -= boxSize + 10;
        this.ensureSpace(boxSize + 8);
      }
      this.page.drawRectangle({
        x,
        y: this.y - boxSize + 1,
        width: boxSize,
        height: boxSize,
        borderWidth: 1,
        borderColor: this.palette.primary700,
        color: item.checked ? this.palette.primary700 : undefined,
      });
      if (item.checked) {
        this.page.drawText("X", { x: x + 1, y: this.y - boxSize + 1.5, size: boxSize - 1, font: this.bold, color: WHITE });
      }
      this.page.drawText(item.label, { x: x + boxSize + 4, y: this.y - boxSize + 1.5, size, font: this.font, color: BLACK });
      x += itemWidth + gap;
    }
    this.y -= boxSize + 14;
  }

  /** One or more blank signature lines, evenly spaced across the content width. */
  signatureRow(labels: string[]) {
    const size = 9.5;
    this.ensureSpace(40);
    this.y -= 20; // room above the line for an actual wet-ink signature
    const colWidth = CONTENT_WIDTH / labels.length;
    labels.forEach((label, i) => {
      const x = MARGIN + i * colWidth;
      const width = colWidth - 16;
      this.page.drawLine({ start: { x, y: this.y }, end: { x: x + width, y: this.y }, thickness: 1.1, color: this.palette.primary900 });
      this.page.drawText(label, { x, y: this.y - 12, size, font: this.font, color: GRAY });
    });
    this.y -= 26;
  }

  spacer(amount = 8) {
    this.y -= amount;
  }
}

function policySection(writer: PdfWriter, sections: PolicySubsection[]) {
  for (const section of sections) {
    writer.subsectionHeader(section.heading);
    if (section.body) writer.paragraph(section.body);
    if (section.bullets) writer.bulletList(section.bullets);
    writer.spacer(4);
  }
}

function fullName(admission: AdmissionRecord): string {
  return admission.student_full_name;
}

function guardianDisplayName(admission: AdmissionRecord): string | null {
  if (admission.father_email) return admission.father_name ?? null;
  if (admission.mother_email) return admission.mother_name ?? null;
  return admission.father_name ?? admission.mother_name ?? null;
}

/** Draws a subtle footer (page number, center name, generated-on date) on
 * every page of the finished document. Run as a final pass so the total
 * page count is known. */
function drawFooters(doc: PDFDocument, font: PDFFont, center: AdmissionCenter) {
  const generatedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const pages = doc.getPages();
  const total = pages.length;
  const size = 8;

  pages.forEach((page, i) => {
    page.drawRectangle({
      x: MARGIN,
      y: 34,
      width: CONTENT_WIDTH,
      height: 0.75,
      color: FOOTER_RULE,
    });
    const text = `${SCHOOL_NAME[center]}   •   Page ${i + 1} of ${total}   •   Generated ${generatedOn}`;
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y: 20,
      size,
      font,
      color: FOOTER_GRAY,
    });
  });
}

export async function generateAdmissionPdf(admission: AdmissionRecord, center: AdmissionCenter): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${SCHOOL_NAME[center]} — Registration Form — ${fullName(admission)}`);
  doc.setAuthor(SCHOOL_NAME[center]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const logoFile = center === "akis" ? "crest-navy.png" : "aket-seal.png";
  let logo: PDFImage | null = null;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "brand", logoFile));
    logo = await doc.embedPng(bytes);
  } catch {
    // Missing/unreadable asset shouldn't block generating the rest of the
    // form — falls back to the text-only header.
    logo = null;
  }

  const writer = new PdfWriter(doc, font, bold, serifBold, center, logo);

  // ---------------------------------------------------------------------
  // Page 1: Personal Information
  // ---------------------------------------------------------------------
  writer.newPage(true);
  writer.sectionHeader("PERSONAL INFORMATION");

  writer.fieldRow([
    { label: "Student Full Name", value: admission.student_full_name },
    { label: "Gender", value: admission.student_gender === "male" ? "Male" : "Female" },
  ]);
  writer.fieldRow([
    { label: "Date of Birth", value: admission.student_dob },
    { label: "Emirates ID / Passport #", value: admission.student_id_number },
  ]);
  writer.fieldRow([
    { label: "Religion", value: admission.student_religion },
    { label: "Nationality", value: admission.student_nationality },
  ]);

  writer.spacer(4);
  writer.subsectionHeader("Father's Information");
  writer.fieldRow([
    { label: "Name", value: admission.father_name },
    { label: "Job Title", value: admission.father_job_title },
  ]);
  writer.fieldRow([
    { label: "Mobile", value: admission.father_mobile },
    { label: "Email", value: admission.father_email },
  ]);
  writer.field("Nationality", admission.father_nationality, 0.5);

  writer.spacer(4);
  writer.subsectionHeader("Mother's Information");
  writer.fieldRow([
    { label: "Name", value: admission.mother_name },
    { label: "Job Title", value: admission.mother_job_title },
  ]);
  writer.fieldRow([
    { label: "Mobile", value: admission.mother_mobile },
    { label: "Email", value: admission.mother_email },
  ]);
  writer.field("Nationality", admission.mother_nationality, 0.5);

  writer.spacer(4);
  writer.subsectionHeader("Residence Address");
  writer.fieldRow([
    { label: "Emirate", value: admission.address_emirate },
    { label: "Area", value: admission.address_area },
  ]);
  writer.fieldRow([
    { label: "Street", value: admission.address_street },
    { label: "Building", value: admission.address_building },
  ]);

  writer.spacer(6);
  writer.bulletList(DECLARATION_BULLETS[center]);

  writer.signatureRow(["Date", "Parent / Guardian Signature"]);
  if (center === "aket") {
    writer.signatureRow(["Manager's signature"]);
  }

  // ---------------------------------------------------------------------
  // Medical History
  // ---------------------------------------------------------------------
  writer.newPage(false);
  writer.sectionHeader("MEDICAL HISTORY OF STUDENT");
  writer.paragraph("Does your child have any health conditions or take any medications that we need to be aware of?", { bold: true });
  if (admission.medical_conditions) writer.paragraph(admission.medical_conditions);

  writer.paragraph("1. Does your child have difficulty/problems with any of the following? (Please tick).");
  writer.checkboxRow([
    { label: "Vision", checked: admission.medical_vision },
    { label: "Motor sensory skills", checked: admission.medical_motor },
    { label: "Hearing", checked: admission.medical_hearing },
    { label: "Poor balance/instability", checked: admission.medical_balance },
    { label: "Speech", checked: admission.medical_speech },
    { label: "Language", checked: admission.medical_speech },
  ]);

  writer.spacer(6);
  writer.paragraph(`2. Does your child have any allergies?  ${admission.medical_allergies ? "YES" : "NO"}`, { bold: true });
  if (center === "aket") {
    writer.field(
      "If yes, please explain what causes of allergy have been identified…",
      admission.medical_allergies_detail
    );
  } else if (admission.medical_allergies_detail) {
    writer.paragraph(admission.medical_allergies_detail);
  }

  // ---------------------------------------------------------------------
  // Informed Consent
  // ---------------------------------------------------------------------
  writer.newPage(false);
  writer.sectionHeader("INFORMED CONSENT");
  writer.paragraph(CONSENT_INTRO, { bold: true });
  writer.bulletList(CONSENT_BULLETS[center]);

  writer.subsectionHeader("DISCLAIMER");
  writer.paragraph(DISCLAIMER[center]);

  writer.signatureRow(["Date", "PARENT / GUARDIAN SIGNATURE"]);

  if (center === "akis") {
    writer.fieldRow([
      { label: "Registration Date:", value: admission.registration_date },
      { label: "Enrolment Grade:", value: admission.enrolment_grade },
    ]);
  } else {
    writer.subsectionHeader("To be filled by Al Kamal Education Technology staff");
    writer.fieldRow([
      { label: "REGISTRATION DATE", value: admission.registration_date },
      { label: "PACKAGE/S", value: admission.package_name },
    ]);
  }

  // ---------------------------------------------------------------------
  // Payment Policies and Agreements
  // ---------------------------------------------------------------------
  writer.newPage(false);
  writer.sectionHeader("PAYMENT POLICIES AND AGREEMENTS");
  policySection(writer, PAYMENT_POLICIES[center]);

  if (center === "akis") {
    writer.fieldRow([
      { label: "Parent/Guardian Name:", value: guardianDisplayName(admission) },
      { label: "Date:", value: null },
    ]);
    writer.signatureRow(["Parent/Guardian Signature", "Principal Signature"]);
  } else {
    writer.fieldRow([
      { label: "Student Name:", value: admission.student_full_name },
      { label: "Date:", value: null },
    ]);
    writer.signatureRow(["Parent/Guardian's Signature", "Principal's Signature"]);
  }

  // ---------------------------------------------------------------------
  // Additional Policies — AKIS only
  // ---------------------------------------------------------------------
  if (center === "akis") {
    writer.newPage(false);
    writer.sectionHeader("ADDITIONAL POLICIES");
    policySection(writer, ADDITIONAL_POLICIES);

    writer.fieldRow([
      { label: "Parent/Guardian Name:", value: guardianDisplayName(admission) },
      { label: "Date:", value: null },
    ]);
    writer.signatureRow(["Parent/Guardian Signature", "Principal Signature"]);
  }

  drawFooters(doc, font, center);

  return doc.save();
}
