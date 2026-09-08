/**
 * Builds the download/attachment filename for a generated admission PDF.
 *
 * Format (Muhammad's explicit request, chat, 2026-09-08):
 * `<Full Student Name>_<Student ID>_<Academic Year>.pdf`, e.g.
 * `Talal A M Awad_AKIS-2026-0001_2025-2026.pdf`.
 *
 * The student ID already starts with the center code (AKIS-/AKET-, see
 * generateEnrollmentNumber in (dashboard)/admin/admissions/actions.ts), so
 * there's no separate center segment here the way the old format had one.
 *
 * The name segment keeps spaces (a real person's name reads better with
 * them, and every modern OS/browser handles a space in a downloaded
 * filename fine) but strips characters that are unsafe or meaningless in a
 * filename (path separators, quotes, control characters); the underscore is
 * reserved as the segment separator, so any underscore embedded in the name
 * itself becomes a space to keep the three segments unambiguous. Falls back
 * to "Student" if the name sanitizes to nothing, so the filename is never
 * empty.
 *
 * Pure string logic only — no I/O. Intended to be called by the code that
 * actually serves/downloads the PDF (see getAdmissionPdfUrl.ts).
 */
export function buildAdmissionPdfFilename(opts: { studentFullName: string; enrollmentNumber: string; academicYear: string }): string {
  const sanitizedName = opts.studentFullName
    .trim()
    .replace(/_/g, " ")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const namePart = sanitizedName.length > 0 ? sanitizedName : "Student";

  return `${namePart}_${opts.enrollmentNumber}_${opts.academicYear}.pdf`;
}
