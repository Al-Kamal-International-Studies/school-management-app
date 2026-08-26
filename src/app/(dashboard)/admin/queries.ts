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
 *
 * `activeCenterId` is the multi-center admin's currently-selected center
 * (resolved by the caller via getActiveCenterForRequest() — see that file's
 * doc comment; for a single-center account this is always just their own
 * profile.center_id, so every filter below is a no-op for them and these
 * counts are byte-for-byte the same as before center filtering existed).
 * Without this, a multi-center admin always saw a combined AKIS+AKET total
 * here regardless of which center they'd switched to — RLS correctly let
 * their session see both centers' rows, but nothing in this query was ever
 * narrowing to just the active one. See HANDOVER.md for the full writeup.
 */
export async function getOverviewCounts(activeCenterId: string): Promise<OverviewCounts> {
  const supabase = await createClient();

  // leave_requests has no center_id of its own (see 0027_centers.sql's own
  // SCOPE comment — it's reachable only via student_id -> profiles.id), so
  // scoping the pending-leave count to the active center means first
  // resolving which active students belong to it, then counting
  // leave_requests for just those students — the same fetch-ids-then-filter
  // shape every other cross-table query in this codebase already uses (see
  // e.g. listAllProgressEntries below).
  const { data: studentsInCenter } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("center_id", activeCenterId)
    .is("archived_at", null);
  const studentIdsInCenter = (studentsInCenter ?? []).map((s) => s.id);

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
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").eq("center_id", activeCenterId).is("archived_at", null),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher").eq("center_id", activeCenterId).is("archived_at", null),
    supabase.from("classes").select("*", { count: "exact", head: true }).eq("center_id", activeCenterId),
    // See studentIdsInCenter above. Guarded the same way every other
    // fetch-ids-then-filter query in this codebase is (e.g.
    // listAllProgressEntries's studentIds.length checks) — a center with
    // zero active students short-circuits to a literal 0 rather than
    // sending an empty `.in()`.
    studentIdsInCenter.length
      ? supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending").in("student_id", studentIdsInCenter)
      : Promise.resolve({ count: 0 }),
    supabase.from("feedback").select("*", { count: "exact", head: true }).neq("status", "resolved").eq("center_id", activeCenterId),
    // password_reset_requests deliberately keeps no center_id and is NOT
    // filtered here — 0027_centers.sql's own SCOPE comment groups it with
    // audit_logs/rate_limit_events as an operational/system log, not
    // center-scoped tenant data, and a reset request can arrive for an
    // email that has no matching profile yet (so there'd be no center to
    // resolve for some rows anyway). Stays a school-wide count for every
    // admin, single- or multi-center alike — matches
    // listPendingPasswordResetRequests() staying unfiltered too.
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
 * School-wide (i.e. active-center-wide) attendance rate, this week vs. the
 * week before — a single ranged query (indexed on `date`, see
 * idx_attendance_date) over the last 14 days, aggregated in memory rather
 * than one query per day. Only `date`/`status` columns are selected, so the
 * payload stays small even for a school with hundreds of students marked
 * daily.
 *
 * attendance_records has no center_id of its own (see 0027_centers.sql's
 * SCOPE comment) — reachable only via class_id -> classes.center_id — so
 * this first resolves which classes belong to `activeCenterId` and filters
 * on those. A center with zero classes (e.g. a brand-new AKET before any
 * classes exist) short-circuits straight to the "no data" shape instead of
 * sending an empty `.in()`.
 */
export async function getAttendanceTrend(activeCenterId: string): Promise<AttendanceTrend> {
  const supabase = await createClient();

  const { data: classesInCenter } = await supabase.from("classes").select("id").eq("center_id", activeCenterId);
  const classIdsInCenter = (classesInCenter ?? []).map((c) => c.id);
  if (classIdsInCenter.length === 0) {
    return { thisWeekRate: null, delta: null, sparkline: [] };
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 13); // 14-day window: this week + the week before
  const startStr = start.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("attendance_records")
    .select("date, status")
    .gte("date", startStr)
    .in("class_id", classIdsInCenter);
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

/**
 * Same source as the full Audit Log page, just the newest few for the
 * overview feed. Deliberately NOT filtered by active center — audit_logs
 * has no center_id and 0027_centers.sql's own SCOPE comment explicitly
 * categorizes it as an operational/system log rather than center-scoped
 * tenant data (a single admin action can itself span centers, e.g.
 * switching the active center, so there isn't always one clean center to
 * attribute a log row to anyway). Matches /admin/audit-log staying
 * unfiltered too.
 */
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

/** Events from today onward, soonest first, scoped to the active center — same query shape as /calendar and /admin/events. */
export async function listUpcomingEvents(activeCenterId: string, limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("center_id", activeCenterId)
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true })
    .limit(limit);
  return data ?? [];
}
