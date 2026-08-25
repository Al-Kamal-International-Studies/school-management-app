import type { AdmissionCenter } from "./generatePdf";

/**
 * Builds the download/attachment filename for a generated admission PDF.
 *
 * Format: `<AKIS|AKET>-<enrollmentNumber>-<Student-Full-Name>.pdf`, e.g.
 * `AKIS-AD-2026-7K2QM-Talal-A-M-Awad.pdf`.
 *
 * The name portion keeps only alphanumeric characters and hyphens — any run
 * of other characters (spaces, punctuation, etc.) becomes a single hyphen,
 * repeated hyphens collapse to one, and leading/trailing hyphens are
 * stripped. Falls back to "Student" if the name sanitizes to nothing, so the
 * filename is never empty.
 *
 * Pure string logic only — no I/O. Intended to be called by the code that
 * actually serves/downloads the PDF (see actions.ts / DownloadPdfButton.tsx).
 */
export function buildAdmissionPdfFilename(opts: {
  center: AdmissionCenter;
  studentFullName: string;
  enrollmentNumber: string;
}): string {
  const centerLabel = opts.center === "akis" ? "AKIS" : "AKET";

  const sanitizedName = opts.studentFullName
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const namePart = sanitizedName.length > 0 ? sanitizedName : "Student";

  return `${centerLabel}-${opts.enrollmentNumber}-${namePart}.pdf`;
}
