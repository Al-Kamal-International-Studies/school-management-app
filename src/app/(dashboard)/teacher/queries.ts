import { createClient } from "@/lib/supabase/server";

export async function listMyClasses(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("class_subject_teachers")
    .select("*")
    .eq("teacher_id", teacherId);

  if (!assignments || assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];

  const [{ data: classes }, { data: subjects }, { data: students }] = await Promise.all([
    supabase.from("classes").select("id, name, section").in("id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("students").select("id, class_id").in("class_id", classIds),
  ]);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, c]));
  const studentCounts = new Map<string, number>();
  for (const s of students ?? []) {
    if (!s.class_id) continue;
    studentCounts.set(s.class_id, (studentCounts.get(s.class_id) ?? 0) + 1);
  }

  return assignments.map((a) => ({
    id: a.id,
    class: classMap.get(a.class_id),
    subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
    studentCount: studentCounts.get(a.class_id) ?? 0,
  }));
}

export async function getMySchedule(teacherId: string) {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("start_time");

  if (!entries || entries.length === 0) return [];

  const classIds = [...new Set(entries.map((e) => e.class_id))];
  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];

  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, name, section").in("id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
  ]);

  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return entries.map((e) => ({
    ...e,
    className: classMap.get(e.class_id) ?? "Unknown",
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
  }));
}

export interface TeacherOverviewStats {
  upcomingExamCount: number;
  pendingGradingCount: number;
}

/**
 * Two cheap `head: true` counts for the dashboard's KPI row: exams/quizzes
 * this teacher has scheduled from today onward, and submissions still
 * waiting on a grade. The submissions count needs no explicit teacher
 * filter — its RLS select policy already scopes rows to submissions for
 * assignments this teacher authored (see migration 0019), same as every
 * other teacher-scoped query in this app relying on RLS rather than a
 * redundant client-side filter.
 */
export async function getOverviewStats(teacherId: string): Promise<TeacherOverviewStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: upcomingExamCount }, { count: pendingGradingCount }] = await Promise.all([
    supabase.from("exams").select("*", { count: "exact", head: true }).eq("teacher_id", teacherId).gte("exam_date", today),
    supabase.from("assignment_submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
  ]);

  return {
    upcomingExamCount: upcomingExamCount ?? 0,
    pendingGradingCount: pendingGradingCount ?? 0,
  };
}
