"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { notifyUsers } from "@/lib/notifications/notify";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const examSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  title: z.string().min(1, "Title is required."),
  exam_type: z.enum(["exam", "quiz"]),
  exam_date: z.string().min(1, "Date is required."),
  start_time: z.string().optional(),
  room: z.string().optional(),
});

export async function createExamAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = examSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("exams")
    .insert({
      ...parsed.data,
      start_time: parsed.data.start_time || null,
      room: parsed.data.room || null,
      teacher_id: me.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "create_exam", "exams", created.id, { title: parsed.data.title, exam_date: parsed.data.exam_date });

  // Best-effort notify — every student currently enrolled in the class.
  // Never blocks the exam from being saved.
  const { data: students } = await supabase.from("students").select("id").eq("class_id", parsed.data.class_id);
  if (students?.length) {
    await notifyUsers(
      students.map((s) => s.id),
      {
        type: "exam",
        title: `New ${parsed.data.exam_type}: ${parsed.data.title}`,
        body: `${parsed.data.exam_date}${parsed.data.start_time ? ` at ${parsed.data.start_time}` : ""}`,
        url: "/student/exams",
      }
    );
  }

  revalidatePath("/teacher/exams");
  return { success: true };
}
