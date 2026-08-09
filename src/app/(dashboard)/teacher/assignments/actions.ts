"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const assignmentSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  due_date: z.string().min(1, "Due date is required."),
});

export async function createAssignmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    ...parsed.data,
    description: parsed.data.description || null,
    teacher_id: me.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/teacher/assignments");
  return { success: true };
}

const gradeSchema = z.object({
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  grade: z.coerce.number().min(0).max(100),
  feedback: z.string().optional(),
});

export async function gradeSubmissionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("teacher");
  const parsed = gradeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("assignment_submissions").upsert(
    {
      assignment_id: parsed.data.assignment_id,
      student_id: parsed.data.student_id,
      grade: parsed.data.grade,
      feedback: parsed.data.feedback || null,
      status: "graded",
    },
    { onConflict: "assignment_id,student_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/teacher/assignments/${parsed.data.assignment_id}`);
  return { success: true };
}
