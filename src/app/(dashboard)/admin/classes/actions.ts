"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export interface ActionState {
  error?: string;
}

const classSchema = z.object({
  name: z.string().min(1, "Class name is required."),
  section: z.string().min(1, "Section is required."),
  academic_year: z.string().min(4, "Academic year is required."),
  homeroom_teacher_id: z.string().optional(),
});

export async function createClassAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = classSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  // Without an explicit center_id, this insert falls back to the column's
  // schema default (AKIS — see 0027_centers.sql) regardless of which
  // center the admin is actually looking at, so a multi-center admin
  // creating a class while viewing AKET would silently get an
  // AKIS-centered class instead. `me.center_id` is deliberately NOT used
  // here — that's the admin's own home center, not necessarily the one
  // they're currently working in.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: created, error } = await supabase
    .from("classes")
    .insert({
      name: parsed.data.name,
      section: parsed.data.section,
      academic_year: parsed.data.academic_year,
      homeroom_teacher_id: parsed.data.homeroom_teacher_id || null,
      center_id: activeCenterId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "A class with this name, section, and year already exists." : error.message };
  }

  await logAuditEvent(me.id, "create_class", "classes", created.id, { name: parsed.data.name, section: parsed.data.section });

  revalidatePath("/admin/classes");
  redirect("/admin/classes");
}

export async function updateClassAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = classSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      name: parsed.data.name,
      section: parsed.data.section,
      academic_year: parsed.data.academic_year,
      homeroom_teacher_id: parsed.data.homeroom_teacher_id || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAuditEvent(me.id, "update_class", "classes", id, { name: parsed.data.name, section: parsed.data.section });

  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  redirect(`/admin/classes/${id}`);
}

const assignTeacherSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
});

export async function assignSubjectTeacherAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = assignTeacherSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Select a subject and teacher." };

  const supabase = await createClient();
  const { error } = await supabase.from("class_subject_teachers").upsert(parsed.data, { onConflict: "class_id,subject_id" });
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "assign_subject_teacher", "class_subject_teachers", parsed.data.class_id, parsed.data);

  revalidatePath(`/admin/classes/${parsed.data.class_id}`);
  return {};
}

export async function removeSubjectTeacherAction(id: string, classId: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("class_subject_teachers").delete().eq("id", id);
  await logAuditEvent(me.id, "remove_subject_teacher", "class_subject_teachers", id);
  revalidatePath(`/admin/classes/${classId}`);
}
