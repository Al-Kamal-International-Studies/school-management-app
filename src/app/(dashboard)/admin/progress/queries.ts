import { createClient } from "@/lib/supabase/server";

export interface ProgressListFilters {
  studentId?: string;
  classId?: string;
  month?: string;
}

export async function listAllProgressEntries(filters: ProgressListFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("monthly_progress_entries").select("*").order("month", { ascending: false });

  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.month) query = query.eq("month", filters.month);

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return [];

  const studentIds = [...new Set(entries.map((e) => e.student_id))];
  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const classIds = [...new Set(entries.map((e) => e.class_id))];
  const teacherIds = [...new Set(entries.map((e) => e.teacher_id))];

  const [{ data: profiles }, { data: subjects }, { data: classes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", [...studentIds, ...teacherIds]),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("classes").select("id, name, section").in("id", classIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));

  return entries.map((e) => ({
    ...e,
    studentName: profileMap.get(e.student_id) ?? "Unknown",
    teacherName: profileMap.get(e.teacher_id) ?? "Unknown",
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
    className: classMap.get(e.class_id) ?? "Unknown",
  }));
}

export async function listAllClassesForFilter() {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").order("name");
  return data ?? [];
}

export async function listAllStudentsForFilter() {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id");
  if (!students || students.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", students.map((s) => s.id))
    .order("full_name");
  return profiles ?? [];
}
