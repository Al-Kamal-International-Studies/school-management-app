import { createClient } from "@/lib/supabase/server";

export async function listMyAssignments(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("due_date", { ascending: false });

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
    ...a,
    className: classMap.get(a.class_id) ?? "Unknown",
    subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
  }));
}

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

export async function getAssignmentDetail(assignmentId: string) {
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("*").eq("id", assignmentId).single();
  if (!assignment) return null;

  const [{ data: students }, { data: submissions }] = await Promise.all([
    supabase.from("students").select("id, enrollment_number").eq("class_id", assignment.class_id),
    supabase.from("assignment_submissions").select("*").eq("assignment_id", assignmentId),
  ]);

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: profiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const submissionMap = new Map((submissions ?? []).map((s) => [s.student_id, s]));

  const roster = (students ?? [])
    .map((s) => ({
      studentId: s.id,
      studentName: nameMap.get(s.id) ?? "Unknown",
      enrollmentNumber: s.enrollment_number,
      submission: submissionMap.get(s.id) ?? null,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return { assignment, roster };
}
