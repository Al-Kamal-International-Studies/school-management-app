import type { AttendanceStatus } from "@/lib/types/database.types";

/** How many of a student's most recent records every screen rates over, so all screens agree. */
export const ATTENDANCE_WINDOW = 100;

/** Per-month attendance rates, newest month first ("YYYY-MM-01"), from records with a "YYYY-MM-DD" date. */
export function monthlyAttendanceRates(rows: { date: string; status: AttendanceStatus | string }[]): { month: string; rate: number }[] {
  const byMonth = new Map<string, { status: string }[]>();
  for (const r of rows) {
    const key = `${r.date.slice(0, 7)}-01`;
    const list = byMonth.get(key) ?? [];
    list.push(r);
    byMonth.set(key, list);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .flatMap(([month, list]) => {
      const rate = attendanceRate(list);
      return rate === null ? [] : [{ month, rate }];
    });
}

/**
 * THE attendance percentage — one definition used by every screen (student
 * dashboard + attendance page, parent view, admin overview) so a family never
 * sees two different numbers for the same child. Before this, four screens used
 * four different record windows, and every one counted `late` and `excused` as
 * absent (HANDOVER Part 33, audit finding CR-06).
 *
 * Policy (the conventional school one — change it HERE if the school decides
 * otherwise): a student who arrives late still attended; an excused absence
 * (e.g. approved leave) doesn't count against the student, so excused days are
 * removed from the denominator. Returns null when there is nothing to rate.
 */
export function attendanceRate(rows: { status: AttendanceStatus | string }[]): number | null {
  const counted = rows.filter((r) => r.status !== "excused");
  if (counted.length === 0) return null;
  const attended = counted.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((attended / counted.length) * 1000) / 10;
}
