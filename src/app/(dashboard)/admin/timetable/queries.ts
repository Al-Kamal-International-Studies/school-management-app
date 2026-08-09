import { createClient } from "@/lib/supabase/server";

export async function listClassesForSelect() {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").order("name");
  return data ?? [];
}

export async function getClassSchedule(classId: string) {
  const supabase = await createClient();

  const [{ data: assignments }, { data: entries }] = await Promise.all([
    supabase.from("class_subject_teachers").select("*").eq("class_id", classId),
    supabase.from("timetable_entries").select("*").eq("class_id", classId).order("start_time"),
  ]);

  const subjectIds = [...new Set((assignments ?? []).map((a) => a.subject_id))];
  const teacherIds = [...new Set((assignments ?? []).map((a) => a.teacher_id))];

  const [{ data: subjects }, { data: teachers }] = await Promise.all([
    subjectIds.length ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] }),
    teacherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", teacherIds)
      : Promise.resolve({ data: [] }),
  ]);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

  return {
    // Subjects available to schedule for this class = only ones with an
    // assigned teacher, so the timetable always shows who's teaching.
    assignableSubjects: (assignments ?? []).map((a) => ({
      subjectId: a.subject_id,
      subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
      teacherId: a.teacher_id,
      teacherName: teacherMap.get(a.teacher_id) ?? "Unknown",
    })),
    entries: (entries ?? []).map((e) => ({
      ...e,
      subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
      teacherName: teacherMap.get(e.teacher_id) ?? "Unknown",
    })),
  };
}
