import { createClient } from "@/lib/supabase/server";
import { computeOverallScore } from "@/lib/progress/calculate";

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

  const [{ data: progressEntries }, { data: attendance }, { data: assignments }, { data: exams }, { data: grades }, { data: remarks }, { data: behaviour }, { data: leaveRequests }] =
    await Promise.all([
      supabase.from("monthly_progress_entries").select("*").eq("student_id", studentId).order("month", { ascending: false }).limit(12),
      supabase.from("attendance_records").select("*").eq("student_id", studentId).order("date", { ascending: false }).limit(30),
      classId
        ? supabase.from("assignments").select("*").eq("class_id", classId).order("due_date", { ascending: true }).limit(10)
        : Promise.resolve({ data: [] }),
      classId
        ? supabase.from("exams").select("*").eq("class_id", classId).order("exam_date", { ascending: true }).limit(10)
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

  return {
    overallScore,
    latestMonth,
    attendance: attendance ?? [],
    assignments: assignments ?? [],
    exams: exams ?? [],
    grades: grades ?? [],
    remarks: remarks ?? [],
    behaviour: behaviour ?? [],
    leaveRequests: leaveRequests ?? [],
  };
}
