"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

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
  // Without an explicit center_id, this insert falls back to the column's
  // schema default (AKIS — see 0027_centers.sql) regardless of which
  // center the admin is actually looking at. `me.center_id` is
  // deliberately NOT used here — that's the admin's own home center, not
  // necessarily the one they're currently working in.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: created, error } = await supabase
    .from("subjects")
    .insert({ ...parsed.data, center_id: activeCenterId })
    .select("id")
    .single();
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
