"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/types/database.types";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

/**
 * Bulk-marks attendance for a whole class on one date — one row per
 * student, upserted on the (student_id, date) unique key so re-marking the
 * same day corrects rather than duplicates. RLS additionally verifies the
 * teacher is actually assigned to this class.
 */
export async function markAttendanceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");

  const classId = formData.get("class_id");
  const date = formData.get("date");
  if (typeof classId !== "string" || !classId || typeof date !== "string" || !date) {
    return { error: "Missing class or date." };
  }

  const rows: { student_id: string; class_id: string; date: string; status: AttendanceStatus; marked_by: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("status_") && typeof value === "string" && VALID_STATUSES.includes(value as AttendanceStatus)) {
      rows.push({
        student_id: key.slice("status_".length),
        class_id: classId,
        date,
        status: value as AttendanceStatus,
        marked_by: me.id,
      });
    }
  }
  if (rows.length === 0) return { error: "No students to mark." };

  const supabase = await createClient();
  const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "student_id,date" });
  if (error) return { error: error.message };

  revalidatePath("/teacher/attendance");
  return { success: true };
}
