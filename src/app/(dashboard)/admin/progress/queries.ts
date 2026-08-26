import { createClient } from "@/lib/supabase/server";

export interface ProgressListFilters {
  studentId?: string;
  classId?: string;
  month?: string;
}

/**
 * monthly_progress_entries has no center_id of its own (see
 * 0027_centers.sql's SCOPE comment) — reachable only via
 * class_id -> classes.center_id — so this first resolves which classes
 * belong to `activeCenterId` and filters on those, the same
 * fetch-ids-then-filter shape every cross-table query in this codebase
 * uses. A center with zero classes short-circuits straight to an empty
 * list rather than sending an empty `.in()`.
 */
export async function listAllProgressEntries(filters: ProgressListFilters = {}, activeCenterId: string) {
  const supabase = await createClient();

  const { data: classesInCenter } = await supabase.from("classes").select("id").eq("center_id", activeCenterId);
  const classIdsInCenter = (classesInCenter ?? []).map((c) => c.id);
  if (classIdsInCenter.length === 0) return [];

  let query = supabase.from("monthly_progress_entries").select("*").in("class_id", classIdsInCenter).order("month", { ascending: false });

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

/** For the class filter dropdown — scoped to the active center. */
export async function listAllClassesForFilter(activeCenterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").eq("center_id", activeCenterId).order("name");
  return data ?? [];
}

/** For the student filter dropdown — scoped to the active center. */
export async function listAllStudentsForFilter(activeCenterId: string) {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student")
    .eq("center_id", activeCenterId)
    .order("full_name");
  return profiles ?? [];
}
