/**
 * This school's academic year runs September through June (the standard UAE
 * private-school convention). A date in Sept-Dec belongs to the year that
 * *starts* then; a date in Jan-Aug belongs to the year that started the
 * previous September — e.g. both 15 Nov 2025 and 3 Mar 2026 fall in
 * "2025-2026". Used anywhere a document needs to say which school year it
 * belongs to (currently: the admission PDF's download filename — see
 * lib/admissions/pdfFilename.ts) — deliberately separate from a student ID's
 * own embedded year (lib/admissions/generateEnrollmentNumber in
 * (dashboard)/admin/admissions/actions.ts), which is a fixed point-in-time
 * "year of admission", not a recurring label.
 */
export function academicYearLabel(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January … 11 = December
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
