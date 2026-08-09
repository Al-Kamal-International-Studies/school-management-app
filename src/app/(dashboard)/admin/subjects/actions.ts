"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

export interface ActionState {
  error?: string;
}

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required."),
  code: z
    .string()
    .min(1, "Subject code is required.")
    .transform((v) => v.toUpperCase()),
});

export async function createSubjectAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("subjects").insert(parsed.data).select("id").single();
  if (error) {
    return { error: error.code === "23505" ? "A subject with this code already exists." : error.message };
  }

  await logAuditEvent(me.id, "create_subject", "subjects", created.id, parsed.data);

  revalidatePath("/admin/subjects");
  return {};
}

export async function deleteSubjectAction(id: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_subject", "subjects", id);
  revalidatePath("/admin/subjects");
}
