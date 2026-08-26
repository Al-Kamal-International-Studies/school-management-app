import { createClient } from "@/lib/supabase/server";

/**
 * Scoped to the active center — without this a multi-center admin always
 * saw every AKIS+AKET class combined here regardless of the center
 * switcher. A no-op filter for every single-center admin.
 */
export async function listClassesWithCounts(activeCenterId: string) {
  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("*").eq("center_id", activeCenterId).order("name");
  if (!classes) return [];

  const { data: students } = await supabase.from("students").select("id, class_id");
  const { data: teachers } = await supabase.from("profiles").select("id, full_name").eq("role", "teacher").eq("center_id", activeCenterId);
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

  const counts = new Map<string, number>();
  for (const s of students ?? []) {
    if (!s.class_id) continue;
    counts.set(s.class_id, (counts.get(s.class_id) ?? 0) + 1);
  }

  return classes.map((c) => ({
    ...c,
    studentCount: counts.get(c.id) ?? 0,
    homeroomTeacherName: c.homeroom_teacher_id ? teacherMap.get(c.homeroom_teacher_id) : undefined,
  }));
}

/** For the homeroom-teacher / subject-teacher dropdowns — scoped to the active center so a class can never be assigned a teacher from the other center. */
export async function listTeachersForSelect(activeCenterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "teacher").eq("center_id", activeCenterId).order("full_name");
  return data ?? [];
}

/** For the "assign a subject" dropdown — scoped to the active center so a class can never be assigned a subject from the other center. */
export async function listSubjectsForSelect(activeCenterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("id, name, code").eq("center_id", activeCenterId).order("name");
  return data ?? [];
}

/**
 * Fetched by id, not by list — deliberately NOT filtered by activeCenterId
 * itself (RLS's has_center_access(center_id) already gates which classes a
 * multi-center admin can reach here, same reasoning as getUserDetail).
 * `activeCenterId` is still threaded through to scope the *dropdowns* this
 * detail page renders (assignable subjects/teachers) to the admin's
 * currently-active center — matching every other admin form, and matching
 * the class itself in the ordinary case where it belongs to that center.
 */
export async function getClassDetail(id: string, activeCenterId: string) {
  const supabase = await createClient();
  const { data: classRow } = await supabase.from("classes").select("*").eq("id", id).single();
  if (!classRow) return null;

  const [{ data: assignments }, { data: students }] = await Promise.all([
    supabase.from("class_subject_teachers").select("*").eq("class_id", id),
    supabase.from("students").select("id, enrollment_number").eq("class_id", id),
  ]);

  const subjects = await listSubjectsForSelect(activeCenterId);
  const teachers = await listTeachersForSelect(activeCenterId);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const studentProfiles = students?.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          students.map((s) => s.id)
        )
    : { data: [] };
  const nameMap = new Map((studentProfiles.data ?? []).map((p) => [p.id, p.full_name]));

  return {
    classRow,
    assignments: (assignments ?? []).map((a) => ({
      ...a,
      subject: subjectMap.get(a.subject_id),
      teacher: teacherMap.get(a.teacher_id),
    })),
    students: (students ?? []).map((s) => ({ ...s, full_name: nameMap.get(s.id) ?? "" })),
    subjects,
    teachers,
  };
}
