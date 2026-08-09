"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const percent = z.coerce.number().min(0, "Must be 0-100.").max(100, "Must be 0-100.");

const entrySchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  month: z
    .string()
    .min(1, "Month is required.")
    .transform((v) => (/^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v)),
  attendance_percentage: percent,
  homework_completion: percent,
  class_participation: percent,
  behaviour_conduct: percent,
  assessment_performance: percent,
  subject_understanding: percent,
  teacher_comments: z.string().optional(),
  improvement_priority_areas: z.string().optional(),
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

  revalidatePath("/teacher/progress");
  return { success: true };
}
