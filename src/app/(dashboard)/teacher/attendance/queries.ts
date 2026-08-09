import { createClient } from "@/lib/supabase/server";

export async function listMyAttendanceClasses(teacherId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("class_subject_teachers").select("class_id").eq("teacher_id", teacherId);
  if (!assignments || assignments.length === 0) return [];
  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const { data: classes } = await supabase.from("classes").select("id, name, section").in("id", classIds).order("name");
  return classes ?? [];
}

export async function listStudentsInClass(classId: string) {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id, enrollment_number").eq("class_id", classId);
  if (!students || students.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", students.map((s) => s.id));
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return students
    .map((s) => ({ ...s, full_name: nameMap.get(s.id) ?? "Unknown" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getAttendanceForClassDate(classId: string, date: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("attendance_records").select("*").eq("class_id", classId).eq("date", date);
  return data ?? [];
}

export async function listMyAttendanceHistory(teacherId: string, filters: { classId?: string; date?: string }) {
  const supabase = await createClient();
  let query = supabase.from("attendance_records").select("*").eq("marked_by", teacherId).order("date", { ascending: false }).limit(100);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.date) query = query.eq("date", filters.date);

  const { data: records } = await query;
  if (!records || records.length === 0) return [];

  const studentIds = [...new Set(records.map((r) => r.student_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return records.map((r) => ({ ...r, studentName: nameMap.get(r.student_id) ?? "Unknown" }));
}
