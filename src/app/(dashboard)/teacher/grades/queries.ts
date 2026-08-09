import { createClient } from "@/lib/supabase/server";

export async function listMyGradeTargets(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("class_subject_teachers").select("*").eq("teacher_id", teacherId);
  if (!assignments || assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];
  const [{ data: students }, { data: subjects }, { data: classes }] = await Promise.all([
    supabase.from("students").select("id, class_id").in("class_id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("classes").select("id, name, section").in("id", classIds),
  ]);
  const studentIds = (students ?? []).map((s) => s.id);
  const { data: profiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));

  const targets: { studentId: string; studentName: string; subjectId: string; subjectName: string; classId: string; className: string }[] = [];
  for (const a of assignments) {
    for (const s of (students ?? []).filter((st) => st.class_id === a.class_id)) {
      targets.push({
        studentId: s.id,
        studentName: profileMap.get(s.id) ?? "Unknown",
        subjectId: a.subject_id,
        subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
        classId: a.class_id,
        className: classMap.get(a.class_id) ?? "Unknown",
      });
    }
  }
  return targets.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function listMyGrades(teacherId: string) {
  const supabase = await createClient();
  const { data: grades } = await supabase.from("grades").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false });
  if (!grades || grades.length === 0) return [];

  const studentIds = [...new Set(grades.map((g) => g.student_id))];
  const subjectIds = [...new Set(grades.map((g) => g.subject_id))];
  const [{ data: profiles }, { data: subjects }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return grades.map((g) => ({
    ...g,
    studentName: profileMap.get(g.student_id) ?? "Unknown",
    subjectName: subjectMap.get(g.subject_id) ?? "Unknown",
  }));
}
