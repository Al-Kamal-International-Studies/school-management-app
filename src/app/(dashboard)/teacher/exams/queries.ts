import { createClient } from "@/lib/supabase/server";

export async function listMyClassSubjectOptions(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("class_subject_teachers").select("*").eq("teacher_id", teacherId);
  if (!assignments || assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, name, section").in("id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
  ]);
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return assignments.map((a) => ({
    classId: a.class_id,
    className: classMap.get(a.class_id) ?? "Unknown",
    subjectId: a.subject_id,
    subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
  }));
}

export async function listMyExams(teacherId: string) {
  const supabase = await createClient();
  const { data: exams } = await supabase.from("exams").select("*").eq("teacher_id", teacherId).order("exam_date", { ascending: true });
  if (!exams || exams.length === 0) return [];

  const classIds = [...new Set(exams.map((e) => e.class_id))];
  const subjectIds = [...new Set(exams.map((e) => e.subject_id))];
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, name, section").in("id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
  ]);
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return exams.map((e) => ({
    ...e,
    className: classMap.get(e.class_id) ?? "Unknown",
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
  }));
}
