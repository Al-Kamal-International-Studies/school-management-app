import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAccessibleCenters } from "@/lib/centers/getAccessibleCenters";
import type { Profile } from "@/lib/types/database.types";

/**
 * Who may view/download a given student's ID card. `profiles`/`students`
 * RLS is deliberately broad (see 0002_rls_policies.sql's own header
 * comment — "defense in depth", not fine-grained access control) and
 * 0027_centers.sql's `has_center_access()` only narrows it to "same
 * center", not "this specific relationship" — so this is real
 * application-level authorization, the same shape every other
 * cross-profile read in this app (listMyChildren, listMyClasses,
 * getAdmissionPdfUrl's own two-step pattern) already relies on rather than
 * trusting RLS alone:
 *
 *  - student: only their own card.
 *  - parent: only a child actually linked via parent_students.
 *  - teacher: only a student in a class they're assigned to teach
 *    (class_subject_teachers), matching exactly who "their students" means
 *    everywhere else in this app (see teacher/queries.ts's listMyClasses).
 *  - admin: any student whose center the admin has been granted access to
 *    (profile_center_access via getAccessibleCenters) — the same boundary
 *    Part 15's admin center-scoping fix established for every other
 *    admin-facing query.
 */
export async function canViewIdCard(caller: Profile, studentId: string): Promise<boolean> {
  if (caller.role === "student") return caller.id === studentId;

  const supabase = await createClient();

  if (caller.role === "parent") {
    const { count } = await supabase
      .from("parent_students")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", caller.id)
      .eq("student_id", studentId);
    return (count ?? 0) > 0;
  }

  if (caller.role === "teacher") {
    const { data: student } = await supabase.from("students").select("class_id").eq("id", studentId).maybeSingle();
    if (!student?.class_id) return false;
    const { count } = await supabase
      .from("class_subject_teachers")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", caller.id)
      .eq("class_id", student.class_id);
    return (count ?? 0) > 0;
  }

  if (caller.role === "admin") {
    const { data: target } = await supabase.from("profiles").select("center_id").eq("id", studentId).eq("role", "student").maybeSingle();
    if (!target) return false;
    const accessible = await getAccessibleCenters(caller.id);
    return accessible.some((c) => c.id === target.center_id);
  }

  return false;
}

/**
 * Who may CHANGE a student's ID card photo — the same set as canViewIdCard
 * minus teachers, per Muhammad's explicit request (chat, 2026-09-08):
 * teachers can view/download their students' cards but not edit anything.
 * Uploading here writes the same profiles.avatar_url shown everywhere else
 * in the app (topbar, sidebar, etc.) — see setStudentPhotoAction's own doc
 * comment for why that's the right single source of truth rather than a
 * second id-card-specific photo column.
 */
export async function canEditIdCardPhoto(caller: Profile, studentId: string): Promise<boolean> {
  if (caller.role === "teacher") return false;
  return canViewIdCard(caller, studentId);
}
