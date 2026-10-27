"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { numberInRange, requiredText } from "@/lib/validation";
import { notifyUsers } from "@/lib/notifications/notify";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const assignmentSchema = z.object({
  class_id: z.string().guid(),
  subject_id: z.string().guid(),
  title: requiredText("Title is required.", 200),
  description: z.string().trim().max(5000, "Keep the description under 5000 characters.").optional(),
  due_date: z.string().min(1, "Due date is required."),
});

export async function createAssignmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("assignments")
    .insert({
      ...parsed.data,
      description: parsed.data.description || null,
      teacher_id: me.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "create_assignment", "assignments", created.id, { title: parsed.data.title, due_date: parsed.data.due_date });

  // Best-effort notify — every student currently enrolled in the class,
  // same "resolve students from class_id" pattern used throughout this
  // app (see e.g. class-chat/actions.ts). Never blocks the assignment from
  // being saved.
  const { data: students } = await supabase.from("students").select("id").eq("class_id", parsed.data.class_id);
  if (students?.length) {
    await notifyUsers(
      students.map((s) => s.id),
      {
        type: "assignment",
        title: `New assignment: ${parsed.data.title}`,
        body: `Due ${parsed.data.due_date}`,
        url: "/student/assignments",
      }
    );
  }

  revalidatePath("/teacher/assignments");
  return { success: true };
}

const gradeSchema = z.object({
  assignment_id: z.string().guid(),
  student_id: z.string().guid(),
  // A blank grade must NOT become a real 0 that marks the work "graded".
  grade: numberInRange("Enter a grade between 0 and 100.", { min: 0, max: 100 }),
  feedback: z.string().trim().max(2000, "Keep the feedback under 2000 characters.").optional(),
});

export async function gradeSubmissionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
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

  await logAuditEvent(me.id, "grade_submission", "assignment_submissions", parsed.data.assignment_id, {
    student_id: parsed.data.student_id,
    grade: parsed.data.grade,
  });

  revalidatePath(`/teacher/assignments/${parsed.data.assignment_id}`);
  return { success: true };
}
