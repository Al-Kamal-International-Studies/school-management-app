"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { AKET_CENTER_ID } from "@/lib/types/database.types";

export interface ActionState {
  error?: string;
}

const assignmentSchema = z.object({
  teacher_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

/**
 * Creates (or, since the underlying table has a `unique (teacher_id,
 * student_id)` constraint, idempotently re-creates) an autism_assignments
 * pairing. Verifies server-side — not just trusting the dropdown options
 * the form was rendered with — that both profiles are AKET-scoped and hold
 * the correct role, so a stale/tampered form submission can't pair a
 * non-AKET or wrong-role account.
 */
export async function createAutismAssignmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Choose a teacher and a student." };

  const supabase = await createClient();
  const [{ data: teacher }, { data: student }] = await Promise.all([
    supabase.from("profiles").select("id, role, center_id").eq("id", parsed.data.teacher_id).single(),
    supabase.from("profiles").select("id, role, center_id").eq("id", parsed.data.student_id).single(),
  ]);

  if (!teacher || teacher.role !== "teacher" || teacher.center_id !== AKET_CENTER_ID) {
    return { error: "Choose a valid AKET teacher." };
  }
  if (!student || student.role !== "student" || student.center_id !== AKET_CENTER_ID) {
    return { error: "Choose a valid AKET student." };
  }

  const { data: upserted, error } = await supabase
    .from("autism_assignments")
    .upsert({ teacher_id: parsed.data.teacher_id, student_id: parsed.data.student_id, assigned_by: me.id }, { onConflict: "teacher_id,student_id" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "assign_autism_teacher", "autism_assignments", upserted.id, {
    teacher_id: parsed.data.teacher_id,
    student_id: parsed.data.student_id,
  });

  revalidatePath("/admin/autism");
  return {};
}

export async function removeAutismAssignmentAction(id: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("autism_assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAuditEvent(me.id, "remove_autism_assignment", "autism_assignments", id);

  revalidatePath("/admin/autism");
}
