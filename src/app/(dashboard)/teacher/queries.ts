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
