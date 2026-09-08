import "server-only";

import { createClient } from "@/lib/supabase/server";
import { academicYearLabel } from "@/lib/academicYear";
import { AKET_CENTER_ID } from "@/lib/types/database.types";
import type { AdmissionCenter } from "@/lib/admissions/generatePdf";

export interface IdCardData {
  studentId: string;
  center: AdmissionCenter;
  fullName: string;
  enrollmentNumber: string;
  className: string | null;
  dateOfBirth: string | null;
  academicYear: string;
  avatarUrl: string | null;
}

/**
 * Everything an ID card needs, always read fresh from the live profile —
 * deliberately never cached/pre-generated (see generateIdCard.ts's own doc
 * comment for why: a real ID must show the student's CURRENT grade/name/
 * photo, not a snapshot from whenever the card was first "made"). Returns
 * null for anything that isn't actually an active student account, so
 * callers can 404 rather than rendering a card for a parent/teacher/admin
 * id or an archived student.
 */
export async function getIdCardData(studentId: string): Promise<IdCardData | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, date_of_birth, center_id, role, archived_at")
    .eq("id", studentId)
    .single();
  if (!profile || profile.role !== "student" || profile.archived_at) return null;

  const { data: student } = await supabase.from("students").select("enrollment_number, class_id").eq("id", studentId).single();
  if (!student) return null;

  let className: string | null = null;
  let academicYear: string | null = null;
  if (student.class_id) {
    const { data: cls } = await supabase.from("classes").select("name, section, academic_year").eq("id", student.class_id).maybeSingle();
    if (cls) {
      className = `${cls.name} - ${cls.section}`;
      academicYear = cls.academic_year;
    }
  }

  return {
    studentId,
    center: profile.center_id === AKET_CENTER_ID ? "aket" : "akis",
    fullName: profile.full_name,
    enrollmentNumber: student.enrollment_number,
    className,
    dateOfBirth: profile.date_of_birth,
    // A class not yet assigned still needs SOME academic year on the card —
    // falls back to today's own school-year label (same helper the
    // admission PDF's filename uses) rather than leaving the field blank.
    academicYear: academicYear ?? academicYearLabel(new Date()),
    avatarUrl: profile.avatar_url,
  };
}
