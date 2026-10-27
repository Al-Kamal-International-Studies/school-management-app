"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { numberInRange } from "@/lib/validation";
import { schoolToday } from "@/lib/dates";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const percent = numberInRange("Enter a number from 0 to 100.", { min: 0, max: 100 });

const entrySchema = z.object({
  student_id: z.string().guid(),
  subject_id: z.string().guid(),
  class_id: z.string().guid(),
  // "YYYY-MM" (what <input type="month"> sends) or "YYYY-MM-01"; browsers without a
  // month picker send free text, so it is validated, and a progress report can't
  // be filed for a future month (it used to become the student's "current" score)
  // or an absurdly old one.
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}(-01)?$/, "Choose a month (for example 2026-09).")
    .transform((v) => (v.length === 7 ? `${v}-01` : v))
    .refine((v) => v <= `${schoolToday().slice(0, 7)}-01`, "A progress report can't be filed for a future month.")
    .refine((v) => v >= "2020-01-01", "That month is too far in the past."),
  attendance_percentage: percent,
  homework_completion: percent,
  class_participation: percent,
  behaviour_conduct: percent,
  assessment_performance: percent,
  subject_understanding: percent,
  teacher_comments: z.string().trim().max(3000, "Keep comments under 3000 characters.").optional(),
  improvement_priority_areas: z.string().trim().max(3000, "Keep this under 3000 characters.").optional(),
});

/**
 * Submits (or corrects — upserted on the student+subject+month unique key)
 * a monthly progress entry. RLS additionally verifies the teacher actually
 * teaches this class+subject, so even a tampered form submission can't
 * write progress for a student the teacher doesn't have.
 */
export async function submitProgressEntryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");

  const parsed = entrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("monthly_progress_entries").upsert(
    {
      ...parsed.data,
      teacher_comments: parsed.data.teacher_comments || null,
      improvement_priority_areas: parsed.data.improvement_priority_areas || null,
      teacher_id: me.id,
    },
    { onConflict: "student_id,subject_id,month" }
  );

  if (error) return { error: error.message };

  await logAuditEvent(me.id, "submit_progress_entry", "monthly_progress_entries", parsed.data.student_id, {
    subject_id: parsed.data.subject_id,
    month: parsed.data.month,
  });

  revalidatePath("/teacher/progress");
  return { success: true };
}
