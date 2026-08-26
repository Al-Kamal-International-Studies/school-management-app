import { createClient } from "@/lib/supabase/server";

/** For the class-picker at the top of /admin/timetable — scoped to the active center so a multi-center admin can never build a schedule for the other center's class while viewing this one. */
export async function listClassesForSelect(activeCenterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").eq("center_id", activeCenterId).order("name");
  return data ?? [];
}

/**
 * Deliberately NOT filtered by activeCenterId itself — classId always comes
 * from the class-picker above (already scoped to the active center), and
 * timetable_entries/class_subject_teachers have no center_id of their own
 * anyway (see 0027_centers.sql's SCOPE comment); their center identity is
 * entirely inherited from `class_id`, which is already correct by
 * construction once the picker only offers same-center classes.
 */
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
