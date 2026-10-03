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
  name: z.string().trim().min(1, "Subject name is required."),
  code: z
    .string()
    .trim()
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

/**
 * Every table that references a subject does so with ON DELETE CASCADE
 * (0001/0006/0010), so deleting a subject that is in use would silently erase
 * its class assignments, timetable, assignments + submissions, exams, grades and
 * progress entries school-wide (found in the 2026-10-02 audit, HANDOVER Part 33:
 * one click deleted 2 assignments, 4 exams, 1 grade and 1 timetable row, with a
 * confirmation that only mentioned "class/teacher assignments"). So a subject
 * that is still referenced anywhere can't be deleted — remove it from its
 * classes first; only a genuinely unused subject can be removed.
 */
export async function deleteSubjectAction(id: string): Promise<ActionState> {
  const me = await requireRole("admin");
  const supabase = await createClient();

  const { data: subject } = await supabase.from("subjects").select("name, code").eq("id", id).maybeSingle();
  if (!subject) return { error: "Subject not found." };

  const usage = await Promise.all(
    (
      [
        ["class assignment(s)", "class_subject_teachers"],
        ["timetable period(s)", "timetable_entries"],
        ["assignment(s)", "assignments"],
        ["exam(s)", "exams"],
        ["grade(s)", "grades"],
        ["progress report(s)", "monthly_progress_entries"],
      ] as const
    ).map(async ([label, table]) => {
      const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("subject_id", id);
      return { label, count: count ?? 0 };
    })
  );
  const inUse = usage.filter((u) => u.count > 0);
  if (inUse.length > 0) {
    return {
      error: `"${subject.name}" can't be removed because it is still in use: ${inUse.map((u) => `${u.count} ${u.label}`).join(", ")}. Removing it would permanently delete all of that.`,
    };
  }

  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAuditEvent(me.id, "delete_subject", "subjects", id, { name: subject.name, code: subject.code });
  revalidatePath("/admin/subjects");
  return {};
}
