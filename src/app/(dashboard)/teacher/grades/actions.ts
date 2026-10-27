"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { numberInRange, requiredText } from "@/lib/validation";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const gradeSchema = z.object({
  student_id: z.string().guid(),
  subject_id: z.string().guid(),
  class_id: z.string().guid(),
  assessment_name: requiredText("Assessment name is required.", 200),
  marks_obtained: numberInRange("Enter the marks obtained (0 or more).", { min: 0, max: 9999 }),
  marks_total: numberInRange("Enter the total marks (greater than 0).", { gt: 0, max: 9999 }),
  term: requiredText("Term is required.", 100),
});

export async function recordGradeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = gradeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  if (parsed.data.marks_obtained > parsed.data.marks_total) return { error: "Marks obtained cannot exceed marks total." };

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("grades").insert({ ...parsed.data, teacher_id: me.id }).select("id").single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "record_grade", "grades", created.id, {
    student_id: parsed.data.student_id,
    assessment_name: parsed.data.assessment_name,
    marks: `${parsed.data.marks_obtained}/${parsed.data.marks_total}`,
  });

  revalidatePath("/teacher/grades");
  return { success: true };
}
