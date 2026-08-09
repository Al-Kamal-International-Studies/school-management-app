import { createClient } from "@/lib/supabase/server";

export async function listClassesWithCounts() {
  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("*").order("name");
  if (!classes) return [];

  const { data: students } = await supabase.from("students").select("id, class_id");
  const { data: teachers } = await supabase.from("profiles").select("id, full_name").eq("role", "teacher");
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

export async function listTeachersForSelect() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "teacher").order("full_name");
  return data ?? [];
}

export async function listSubjectsForSelect() {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("id, name, code").order("name");
  return data ?? [];
}

export async function getClassDetail(id: string) {
  const supabase = await createClient();
  const { data: classRow } = await supabase.from("classes").select("*").eq("id", id).single();
  if (!classRow) return null;

  const [{ data: assignments }, { data: students }] = await Promise.all([
    supabase.from("class_subject_teachers").select("*").eq("class_id", id),
    supabase.from("students").select("id, enrollment_number").eq("class_id", id),
  ]);

  const subjects = await listSubjectsForSelect();
  const teachers = await listTeachersForSelect();
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
