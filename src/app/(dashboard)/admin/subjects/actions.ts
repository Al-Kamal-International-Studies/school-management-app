"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
  await requireRole("admin");
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert(parsed.data);
  if (error) {
    return { error: error.code === "23505" ? "A subject with this code already exists." : error.message };
  }

  revalidatePath("/admin/subjects");
  return {};
}

export async function deleteSubjectAction(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/subjects");
}
