import { createClient } from "@/lib/supabase/server";

export async function listMyAssignments(studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("class_id").eq("id", studentId).single();
  if (!student?.class_id) return [];

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", student.class_id)
    .order("due_date", { ascending: true });
  if (!assignments || assignments.length === 0) return [];

  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];
  const [{ data: subjects }, { data: submissions }] = await Promise.all([
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("assignment_submissions").select("*").eq("student_id", studentId),
  ]);
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const submissionMap = new Map((submissions ?? []).map((s) => [s.assignment_id, s]));

  return assignments.map((a) => ({
    ...a,
    subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
    submission: submissionMap.get(a.id) ?? null,
  }));
}
