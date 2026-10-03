/**
 * School-calendar date helpers.
 *
 * The app's server code runs in UTC (Vercel), but the school is in the UAE
 * (UTC+4). Anything computed with `new Date().toISOString().slice(0, 10)` or
 * `new Date().getDay()` is therefore the UTC day — between 00:00 and 04:00 UAE
 * time the dashboards showed YESTERDAY's schedule, the attendance form
 * defaulted to yesterday's date and "upcoming" lists lagged a day (found in the
 * 2026-10-02 audit, HANDOVER Part 33). Every "what day is it for the school"
 * question goes through this module instead.
 *
 * Dates are plain "YYYY-MM-DD" strings (the format the database's `date`
 * columns use); arithmetic on them is done in UTC on purpose so it is immune
 * to the host's own timezone.
 */

/** Both AKIS and AKET are in the UAE. */
export const SCHOOL_TIME_ZONE = "Asia/Dubai";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: SCHOOL_TIME_ZONE, weekday: "short" });

const WEEKDAY_TO_DB: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Today's date at the school, "YYYY-MM-DD". */
export function schoolToday(now: Date = new Date()): string {
  return ymdFormatter.format(now);
}

/** Today's weekday at the school in the schema's numbering: 1 = Monday … 7 = Sunday. */
export function schoolWeekdayDb(now: Date = new Date()): number {
  return WEEKDAY_TO_DB[weekdayFormatter.format(now)] ?? 1;
}

/** `iso` ± `days`, as "YYYY-MM-DD" (calendar arithmetic, timezone-proof). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday (ISO week start) of the week containing `iso`, as "YYYY-MM-DD". */
export function weekStartOf(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}

/**
 * Formats an ISO date/timestamp for display in the SCHOOL's timezone and the
 * user's language (English or Arabic) — never the server's locale, which used
 * to render "02/10/2026" (US order) for Arabic users and the server's UTC
 * wall-clock for times.
 */
export function formatSchoolDate(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  const date = typeof value === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value) : value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", { timeZone: SCHOOL_TIME_ZONE, ...options }).format(date);
}

export function formatSchoolDateTime(value: string | Date, locale: string): string {
  return formatSchoolDate(value, locale, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
