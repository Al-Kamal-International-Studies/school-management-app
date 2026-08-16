import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface OverviewCounts {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  pendingLeaveCount: number;
  openFeedbackCount: number;
  pendingPasswordResetCount: number;
}

/**
 * All the "at a glance" counts for the admin overview in one Promise.all —
 * every query here is a `head: true` count (no rows fetched) against an
 * indexed/small table, so this stays cheap regardless of school size.
 */
export async function getOverviewCounts(): Promise<OverviewCounts> {
  const supabase = await createClient();

  const [
    { count: studentCount },
    { count: teacherCount },
    { count: classCount },
    { count: pendingLeaveCount },
    { count: openFeedbackCount },
    { count: pendingPasswordResetCount },
  ] = await Promise.all([
    // Counted via `profiles` (role + archived_at is null) rather than the
    // students/teachers extension tables, so archived accounts — which stay
    // in the database for audit purposes but are excluded from active lists
    // — don't inflate these numbers.
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").is("archived_at", null),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher").is("archived_at", null),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("feedback").select("*", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("password_reset_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    studentCount: studentCount ?? 0,
    teacherCount: teacherCount ?? 0,
    classCount: classCount ?? 0,
    pendingLeaveCount: pendingLeaveCount ?? 0,
    openFeedbackCount: openFeedbackCount ?? 0,
    pendingPasswordResetCount: pendingPasswordResetCount ?? 0,
  };
}

export interface AttendanceTrend {
  thisWeekRate: number | null;
  delta: number | null;
  /** Chronological daily rates for the last 7 days that actually had records — gaps (no school that day) are omitted rather than shown as a 0% dip. */
  sparkline: number[];
}

/**
 * School-wide attendance rate, this week vs. the week before — a single
 * ranged query (indexed on `date`, see idx_attendance_date) over the last
 * 14 days, aggregated in memory rather than one query per day. Only
 * `date`/`status` columns are selected, so the payload stays small even for
 * a school with hundreds of students marked daily.
 */
export async function getAttendanceTrend(): Promise<AttendanceTrend> {
  const supabase = await createClient();

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 13); // 14-day window: this week + the week before
  const startStr = start.toISOString().slice(0, 10);

  const { data } = await supabase.from("attendance_records").select("date, status").gte("date", startStr);
  const rows = data ?? [];

  const byDate = new Map<string, { present: number; total: number }>();
  for (const r of rows) {
    const bucket = byDate.get(r.date) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (r.status === "present") bucket.present += 1;
    byDate.set(r.date, bucket);
  }

  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const dailyRates = days.map((d) => {
    const b = byDate.get(d);
    return b && b.total > 0 ? (b.present / b.total) * 100 : null;
  });

  const last7 = dailyRates.slice(7);
  const prev7 = dailyRates.slice(0, 7);

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
  };

  const thisWeekRate = avg(last7);
  const lastWeekRate = avg(prev7);

  return {
    thisWeekRate: thisWeekRate !== null ? Math.round(thisWeekRate * 10) / 10 : null,
    delta: thisWeekRate !== null && lastWeekRate !== null ? Math.round((thisWeekRate - lastWeekRate) * 10) / 10 : null,
    sparkline: last7.filter((v): v is number => v !== null),
  };
}

export interface RecentActivityItem {
  id: string;
  actorName: string | null;
  action: string;
  targetTable: string | null;
  createdAt: string;
}

/** Same source as the full Audit Log page, just the newest few for the overview feed. */
export async function listRecentActivity(limit = 6): Promise<RecentActivityItem[]> {
  const supabase = await createClient();
  const { data: logs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  const all = logs ?? [];
  if (all.length === 0) return [];

  const actorIds = [...new Set(all.map((l) => l.actor_id).filter((id): id is string => !!id))];
  const { data: profiles } = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return all.map((l) => ({
    id: l.id,
    actorName: l.actor_id ? nameMap.get(l.actor_id) ?? null : null,
    action: l.action,
    targetTable: l.target_table,
    createdAt: l.created_at,
  }));
}

/** Events from today onward, soonest first — same query shape as /calendar and /admin/events. */
export async function listUpcomingEvents(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true })
    .limit(limit);
  return data ?? [];
}
