"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { requiredText } from "@/lib/validation";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const remarkSchema = z.object({
  student_id: z.string().guid(),
  remark: requiredText("Remark is required.", 2000),
});

export async function addRemarkAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = remarkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("teacher_remarks").insert({ ...parsed.data, teacher_id: me.id }).select("id").single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "add_remark", "teacher_remarks", created.id, { student_id: parsed.data.student_id });

  revalidatePath("/teacher/remarks");
  return { success: true };
}

const behaviourSchema = z.object({
  student_id: z.string().guid(),
  category: z.enum(["positive", "negative"]),
  description: requiredText("Description is required.", 2000),
});

export async function addBehaviourEntryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = behaviourSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("behaviour_log").insert({ ...parsed.data, teacher_id: me.id }).select("id").single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "add_behaviour_entry", "behaviour_log", created.id, {
    student_id: parsed.data.student_id,
    category: parsed.data.category,
  });

  revalidatePath("/teacher/remarks");
  return { success: true };
}
