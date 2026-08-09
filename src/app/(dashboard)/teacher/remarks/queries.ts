import { createClient } from "@/lib/supabase/server";

export async function listMyStudents(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("class_subject_teachers").select("class_id").eq("teacher_id", teacherId);
  if (!assignments || assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const { data: students } = await supabase.from("students").select("id, class_id").in("class_id", classIds);
  if (!students || students.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", students.map((s) => s.id));
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return students
    .map((s) => ({ id: s.id, full_name: nameMap.get(s.id) ?? "Unknown" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function listMyRemarks(teacherId: string) {
  const supabase = await createClient();
  const { data: remarks } = await supabase
    .from("teacher_remarks")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!remarks || remarks.length === 0) return [];

  const studentIds = [...new Set(remarks.map((r) => r.student_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return remarks.map((r) => ({ ...r, studentName: nameMap.get(r.student_id) ?? "Unknown" }));
}

export async function listMyBehaviourEntries(teacherId: string) {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("behaviour_log")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!entries || entries.length === 0) return [];

  const studentIds = [...new Set(entries.map((e) => e.student_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return entries.map((e) => ({ ...e, studentName: nameMap.get(e.student_id) ?? "Unknown" }));
}
