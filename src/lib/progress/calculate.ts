import type { MonthlyProgressEntry } from "@/lib/types/database.types";

// The six numeric factors that make up a monthly progress entry, in the
// order they're shown throughout the UI (form, tables, dashboards).
export const PROGRESS_FACTORS = [
  "attendance_percentage",
  "homework_completion",
  "class_participation",
  "behaviour_conduct",
  "assessment_performance",
  "subject_understanding",
] as const;

export type ProgressFactor = (typeof PROGRESS_FACTORS)[number];

/**
 * Overall score = a plain equal-weighted average of the six numeric
 * factors (~16.7% each) — the confirmed default. If per-factor weighting
 * is wanted later, this is the one place to change; nothing else in the
 * app hard-codes the formula.
 */
export function computeOverallScore(entry: Pick<MonthlyProgressEntry, ProgressFactor>): number {
  const sum = PROGRESS_FACTORS.reduce((total, factor) => total + Number(entry[factor]), 0);
  return Math.round((sum / PROGRESS_FACTORS.length) * 10) / 10;
}

/** Formats a "YYYY-MM-01" month value for display, e.g. "August 2026". */
export function formatMonth(month: string, locale: string = "en-US"): string {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00`);
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/** First-of-month "YYYY-MM-01" string for a given Date, defaulting to today. */
export function currentMonthValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export interface MonthlySummary {
  month: string;
  averageScore: number;
  averageAttendance: number;
}

/**
 * Groups monthly progress entries by month and averages across subjects,
 * newest first. Shared by the student dashboard (own progress) and the
 * parent dashboard (a child's progress) so both build their trend
 * sparklines/deltas from the exact same aggregation.
 */
export function summarizeByMonth(entries: Pick<MonthlyProgressEntry, ProgressFactor | "month">[]): MonthlySummary[] {
  const byMonth = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byMonth.get(e.month) ?? [];
    list.push(e);
    byMonth.set(e.month, list);
  }

  return [...byMonth.entries()]
    .map(([month, rows]) => ({
      month,
      averageScore: Math.round((rows.reduce((sum, r) => sum + computeOverallScore(r), 0) / rows.length) * 10) / 10,
      averageAttendance: Math.round((rows.reduce((sum, r) => sum + Number(r.attendance_percentage), 0) / rows.length) * 10) / 10,
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}
