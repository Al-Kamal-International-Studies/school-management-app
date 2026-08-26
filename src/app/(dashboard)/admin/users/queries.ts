import { createClient } from "@/lib/supabase/server";
import type { ClassRow, Profile, Student, Teacher } from "@/lib/types/database.types";

export interface UserRow extends Profile {
  student?: Pick<Student, "enrollment_number" | "class_id">;
  teacher?: Pick<Teacher, "employee_id">;
  className?: string;
}

/**
 * `activeCenterId` scopes this to whichever center the admin currently has
 * selected — without it a multi-center admin always saw every AKIS+AKET
 * user combined here regardless of the center switcher, since RLS lets
 * their session see both centers' profiles and nothing here was narrowing
 * to just the active one. A no-op filter for every single-center admin
 * (their activeCenterId always equals their own profile.center_id).
 */
export async function listUsers(opts: { role?: "teacher" | "student" | "parent"; q?: string }, activeCenterId: string): Promise<UserRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .in("role", opts.role ? [opts.role] : ["teacher", "student", "parent"])
    .eq("center_id", activeCenterId)
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
    // Classes are already implicitly limited to this profile list's center
    // via class_id (a student can only ever be enrolled in a class from
    // their own center), but there's no cheap way to prove that from here
    // without another round trip — fetching every class and mapping by id
    // is what the original code already did, so this stays as-is rather
    // than adding a redundant center filter that can't change the result.
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

/**
 * Fetched by id, not by list — deliberately NOT filtered by activeCenterId.
 * RLS's `has_center_access(center_id)` already gates which profiles a
 * multi-center admin can reach here (either of their granted centers, same
 * as getAdminAutismVideoDetail's reasoning), independent of which center
 * happens to be "active" in the switcher right now. Someone reaching this
 * page via a direct link (e.g. from /admin/password-reset-requests, which
 * is itself intentionally not center-scoped) should still see the account,
 * regardless of the switcher's current position.
 */
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

/** For the "assign a class" dropdown — scoped to the active center so an admin can never pick a class from the other center for a student being created/edited here. */
export async function listClassesForSelect(activeCenterId: string): Promise<Pick<ClassRow, "id" | "name" | "section">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section").eq("center_id", activeCenterId).order("name");
  return data ?? [];
}

/** For the parent-account creation form's "link children" multi-select, scoped to the active center — a parent's children are always at the same center as the parent account being created. */
export async function listStudentsForParentLink(activeCenterId: string) {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student")
    .eq("center_id", activeCenterId)
    .order("full_name");
  if (!profiles || profiles.length === 0) return [];

  const { data: students } = await supabase
    .from("students")
    .select("id, enrollment_number")
    .in(
      "id",
      profiles.map((p) => p.id)
    );
  const enrollmentMap = new Map((students ?? []).map((s) => [s.id, s.enrollment_number]));

  return profiles
    .map((p) => ({ id: p.id, label: `${p.full_name} (${enrollmentMap.get(p.id) ?? "—"})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
