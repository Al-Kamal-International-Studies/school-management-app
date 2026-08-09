import { createClient } from "@/lib/supabase/server";

export interface ProgressTarget {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

/**
 * Every (student, subject) pair this teacher is allowed to submit a
 * progress entry for — derived from their class_subject_teachers
 * assignments crossed with the students currently in those classes. Used
 * to build a single "Student — Subject" picker where every option is
 * guaranteed valid against the insert RLS policy, rather than letting a
 * teacher pick an invalid combo and hitting a database error.
 */
export async function listEligibleProgressTargets(teacherId: string): Promise<ProgressTarget[]> {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("class_subject_teachers")
    .select("*")
    .eq("teacher_id", teacherId);

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

  const targets: ProgressTarget[] = [];
  for (const a of assignments) {
    const classStudents = (students ?? []).filter((s) => s.class_id === a.class_id);
    for (const s of classStudents) {
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

export interface ProgressFilters {
  studentId?: string;
  subjectId?: string;
  classId?: string;
  month?: string;
}

export async function listMyProgressEntries(teacherId: string, filters: ProgressFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("monthly_progress_entries").select("*").eq("teacher_id", teacherId).order("month", { ascending: false });

  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.month) query = query.eq("month", filters.month);

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return [];

  const studentIds = [...new Set(entries.map((e) => e.student_id))];
  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const classIds = [...new Set(entries.map((e) => e.class_id))];

  const [{ data: profiles }, { data: subjects }, { data: classes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("classes").select("id, name, section").in("id", classIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));

  return entries.map((e) => ({
    ...e,
    studentName: profileMap.get(e.student_id) ?? "Unknown",
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
    className: classMap.get(e.class_id) ?? "Unknown",
  }));
}
