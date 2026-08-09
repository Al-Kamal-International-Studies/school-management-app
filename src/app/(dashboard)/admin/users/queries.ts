import { createClient } from "@/lib/supabase/server";
import type { ClassRow, Profile, Student, Teacher } from "@/lib/types/database.types";

export interface UserRow extends Profile {
  student?: Pick<Student, "enrollment_number" | "class_id">;
  teacher?: Pick<Teacher, "employee_id">;
  className?: string;
}

export async function listUsers(opts: { role?: "teacher" | "student" | "parent"; q?: string }): Promise<UserRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .in("role", opts.role ? [opts.role] : ["teacher", "student", "parent"])
    .is("archived_at", null)
    .order("full_name");

  if (opts.q) {
    query = query.or(`full_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);
  }

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];

  const studentIds = profiles.filter((p) => p.role === "student").map((p) => p.id);
  const teacherIds = profiles.filter((p) => p.role === "teacher").map((p) => p.id);

  const [{ data: students }, { data: teachers }, { data: classes }] = await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, enrollment_number, class_id").in("id", studentIds)
      : Promise.resolve({ data: [] as Pick<Student, "id" | "enrollment_number" | "class_id">[] }),
    teacherIds.length
      ? supabase.from("teachers").select("id, employee_id").in("id", teacherIds)
      : Promise.resolve({ data: [] as Pick<Teacher, "id" | "employee_id">[] }),
    supabase.from("classes").select("id, name, section"),
  ]);

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]));
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));

  return profiles.map((p) => {
    const student = studentMap.get(p.id);
    const teacher = teacherMap.get(p.id);
    return {
      ...p,
      student,
      teacher,
      className: student?.class_id ? classMap.get(student.class_id) : undefined,
    };
  });
}

export async function getUserDetail(id: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!profile) return null;

  let student: Student | null = null;
  let teacher: Teacher | null = null;

  if (profile.role === "student") {
    const { data } = await supabase.from("students").select("*").eq("id", id).single();
    student = data;
  } else if (profile.role === "teacher") {
    const { data } = await supabase.from("teachers").select("*").eq("id", id).single();
    teacher = data;
  }

  return { profile, student, teacher };
}

export async function listClassesForSelect(): Promise<Pick<ClassRow, "id" | "name" | "section">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").order("name");
  return data ?? [];
}

/** For the parent-account creation form's "link children" multi-select. */
export async function listStudentsForParentLink() {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id, enrollment_number");
  if (!students || students.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", students.map((s) => s.id))
    .order("full_name");
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return students
    .map((s) => ({ id: s.id, label: `${nameMap.get(s.id) ?? "Unknown"} (${s.enrollment_number})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
