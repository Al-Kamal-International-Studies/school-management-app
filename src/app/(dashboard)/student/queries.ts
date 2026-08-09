import { createClient } from "@/lib/supabase/server";
import { computeOverallScore } from "@/lib/progress/calculate";

export async function getMyClassInfo(studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("*").eq("id", studentId).single();
  if (!student?.class_id) return { student, classRow: null };

  const { data: classRow } = await supabase.from("classes").select("*").eq("id", student.class_id).single();
  return { student, classRow };
}

export async function getMySchedule(classId: string | null) {
  if (!classId) return [];
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("class_id", classId)
    .order("start_time");

  if (!entries || entries.length === 0) return [];

  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const teacherIds = [...new Set(entries.map((e) => e.teacher_id))];

  const [{ data: subjects }, { data: teachers }] = await Promise.all([
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("profiles").select("id, full_name").in("id", teacherIds),
  ]);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

  return entries.map((e) => ({
    ...e,
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
    teacherName: teacherMap.get(e.teacher_id) ?? "Unknown",
  }));
}

/**
 * The student's own monthly progress entries across all subjects, newest
 * first — used to build the attendance summary, progress ring, monthly
 * overview bars, and recent-comments list on the student dashboard.
 */
export async function listMyProgressEntries(studentId: string, limit = 24) {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("monthly_progress_entries")
    .select("*")
    .eq("student_id", studentId)
    .order("month", { ascending: false })
    .limit(limit);

  if (!entries || entries.length === 0) return [];

  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return entries.map((e) => ({ ...e, subjectName: subjectMap.get(e.subject_id) ?? "Unknown" }));
}

export async function listMyRemarks(studentId: string, limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_remarks")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listMyBehaviourEntries(studentId: string, limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_log")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export interface MonthlySummary {
  month: string;
  averageScore: number;
  averageAttendance: number;
}

/** Groups progress entries by month and averages across subjects, newest first. */
export function summarizeByMonth(entries: Awaited<ReturnType<typeof listMyProgressEntries>>): MonthlySummary[] {
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
