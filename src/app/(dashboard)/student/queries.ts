import { createClient } from "@/lib/supabase/server";

export async function getMyClassInfo(studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("*").eq("id", studentId).single();
  if (!student?.class_id) return { student, classRow: null };

  const { data: classRow } = await supabase.from("classes").select("*").eq("id", student.class_id).single();
  return { student, classRow };
}

export async function getMySchedule(classId: string | null) {
  if (!classId) return [];
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("class_id", classId)
    .order("start_time");

  if (!entries || entries.length === 0) return [];

  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const teacherIds = [...new Set(entries.map((e) => e.teacher_id))];

  const [{ data: subjects }, { data: teachers }] = await Promise.all([
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("profiles").select("id, full_name").in("id", teacherIds),
  ]);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

  return entries.map((e) => ({
    ...e,
    subjectName: subjectMap.get(e.subject_id) ?? "Unknown",
    teacherName: teacherMap.get(e.teacher_id) ?? "Unknown",
  }));
}

/**
 * The student's own monthly progress entries across all subjects, newest
 * first — used to build the attendance summary, progress ring, monthly
 * overview bars, and recent-comments list on the student dashboard.
 */
export async function listMyProgressEntries(studentId: string, limit = 24) {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("monthly_progress_entries")
    .select("*")
    .eq("student_id", studentId)
    .order("month", { ascending: false })
    .limit(limit);

  if (!entries || entries.length === 0) return [];

  const subjectIds = [...new Set(entries.map((e) => e.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return entries.map((e) => ({ ...e, subjectName: subjectMap.get(e.subject_id) ?? "Unknown" }));
}

export async function listMyRemarks(studentId: string, limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_remarks")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listMyBehaviourEntries(studentId: string, limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_log")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** The student's most recent recorded grades, newest first — for the dashboard's "Recent Grades" card. */
export async function listMyRecentGrades(studentId: string, limit = 5) {
  const supabase = await createClient();
  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const all = grades ?? [];
  if (all.length === 0) return [];

  const subjectIds = [...new Set(all.map((g) => g.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return all.map((g) => ({ ...g, subjectName: subjectMap.get(g.subject_id) ?? "Unknown" }));
}

export interface UpcomingItem {
  id: string;
  kind: "assignment" | "exam" | "quiz";
  title: string;
  date: string;
  subjectName: string;
}

/**
 * Merges upcoming assignments (due_date >= today) and upcoming exams/quizzes
 * (exam_date >= today) for the student's class into one date-sorted list —
 * real data behind the dashboard's "Upcoming Tasks & Exams" card, which used
 * to be a static "not built yet" placeholder.
 */
export async function listUpcomingItems(classId: string | null, limit = 6): Promise<UpcomingItem[]> {
  if (!classId) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: assignments }, { data: exams }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_date, subject_id")
      .eq("class_id", classId)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit),
    supabase
      .from("exams")
      .select("id, title, exam_date, exam_type, subject_id")
      .eq("class_id", classId)
      .gte("exam_date", today)
      .order("exam_date", { ascending: true })
      .limit(limit),
  ]);

  const items = [
    ...(assignments ?? []).map((a) => ({ id: a.id, kind: "assignment" as const, title: a.title, date: a.due_date, subjectId: a.subject_id })),
    ...(exams ?? []).map((e) => ({ id: e.id, kind: e.exam_type, title: e.title, date: e.exam_date, subjectId: e.subject_id })),
  ];
  if (items.length === 0) return [];

  const subjectIds = [...new Set(items.map((i) => i.subjectId))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return items
    .map((i) => ({ id: i.id, kind: i.kind, title: i.title, date: i.date, subjectName: subjectMap.get(i.subjectId) ?? "Unknown" }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, limit);
}
