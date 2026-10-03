import { createClient } from "@/lib/supabase/server";
import { computeOverallScore, summarizeByMonth } from "@/lib/progress/calculate";
import { schoolToday, weekStartOf } from "@/lib/dates";
import { attendanceRate, ATTENDANCE_WINDOW } from "@/lib/attendance/rate";

export async function listMyChildren(parentId: string) {
  const supabase = await createClient();
  const { data: links } = await supabase.from("parent_students").select("student_id").eq("parent_id", parentId);
  if (!links || links.length === 0) return [];

  const studentIds = links.map((l) => l.student_id);
  const [{ data: students }, { data: profiles }] = await Promise.all([
    supabase.from("students").select("*").in("id", studentIds),
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", studentIds),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const classIds = [...new Set((students ?? []).map((s) => s.class_id).filter((id): id is string => !!id))];
  const { data: classes } = classIds.length ? await supabase.from("classes").select("id, name, section").in("id", classIds) : { data: [] };
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));

  return (students ?? []).map((s) => ({
    ...s,
    full_name: profileMap.get(s.id)?.full_name ?? "Unknown",
    avatar_url: profileMap.get(s.id)?.avatar_url ?? null,
    className: s.class_id ? classMap.get(s.class_id) ?? null : null,
  }));
}

/**
 * Everything a parent should see for one child — a read-only aggregate
 * across the same tables the student's own dashboard/sub-pages read from.
 * RLS (is_parent_of()) enforces that this can only ever return data for a
 * child actually linked to the caller, regardless of what studentId is
 * passed in.
 */
export async function getChildOverview(studentId: string) {
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("class_id").eq("id", studentId).single();
  const classId = student?.class_id ?? null;
  const today = schoolToday();

  const [{ data: progressEntries }, { data: attendance }, { data: assignments }, { data: exams }, { data: grades }, { data: remarks }, { data: behaviour }, { data: leaveRequests }] =
    await Promise.all([
      supabase.from("monthly_progress_entries").select("*").eq("student_id", studentId).order("month", { ascending: false }).limit(12),
      supabase.from("attendance_records").select("*").eq("student_id", studentId).order("date", { ascending: false }).limit(ATTENDANCE_WINDOW),
      classId
        ? supabase.from("assignments").select("*").eq("class_id", classId).gte("due_date", today).order("due_date", { ascending: true }).limit(10)
        : Promise.resolve({ data: [] }),
      classId
        ? supabase.from("exams").select("*").eq("class_id", classId).gte("exam_date", today).order("exam_date", { ascending: true }).limit(10)
        : Promise.resolve({ data: [] }),
      supabase.from("grades").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
      supabase.from("teacher_remarks").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(5),
      supabase.from("behaviour_log").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(5),
      supabase.from("leave_requests").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    ]);

  const entries = progressEntries ?? [];
  const latestMonth = entries[0]?.month;
  const latestEntries = latestMonth ? entries.filter((e) => e.month === latestMonth) : [];
  const overallScore = latestEntries.length
    ? Math.round((latestEntries.reduce((sum, e) => sum + computeOverallScore(e), 0) / latestEntries.length) * 10) / 10
    : null;

  // Monthly score trend (newest first, same aggregation the student's own
  // dashboard uses) — powers the Academic Progress card's sparkline + delta.
  const monthlySummary = summarizeByMonth(entries);
  const scoreDelta = monthlySummary.length > 1 ? monthlySummary[0]!.averageScore - monthlySummary[1]!.averageScore : null;
  const scoreTrend = monthlySummary.slice(0, 6).map((m) => m.averageScore).reverse();

  // Weekly attendance rate, bucketed from the same most-recent records
  // already fetched above — no extra query. Chronological (oldest week
  // first) so the sparkline and the "this week vs last" delta read the
  // same direction as everywhere else in the app.
  const weekBuckets = new Map<string, { status: string }[]>();
  for (const r of attendance ?? []) {
    const key = weekStartOf(r.date);
    const list = weekBuckets.get(key) ?? [];
    list.push(r);
    weekBuckets.set(key, list);
  }
  const weeklyAttendance = [...weekBuckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .flatMap(([week, list]) => {
      const rate = attendanceRate(list);
      return rate === null ? [] : [{ week, rate }];
    });
  const attendanceTrend = weeklyAttendance.slice(-6).map((w) => w.rate);
  const attendanceDelta =
    weeklyAttendance.length > 1
      ? Math.round((weeklyAttendance[weeklyAttendance.length - 1]!.rate - weeklyAttendance[weeklyAttendance.length - 2]!.rate) * 10) / 10
      : null;

  return {
    overallScore,
    latestMonth,
    scoreTrend,
    scoreDelta,
    attendanceTrend,
    attendanceDelta,
    attendance: attendance ?? [],
    assignments: assignments ?? [],
    exams: exams ?? [],
    grades: grades ?? [],
    remarks: remarks ?? [],
    behaviour: behaviour ?? [],
    leaveRequests: leaveRequests ?? [],
  };
}
