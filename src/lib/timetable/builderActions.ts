"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

export interface ActionState {
  error?: string;
}

const entrySchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day_of_week: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter an end time."),
  room: z.string().optional(),
});

/**
 * Shared by both /admin/timetable and /teacher/timetable-builder — Muhammad,
 * chat, 2026-09-09: "give the teachers the exact same access for creating
 * timetables that the admins have." requireRole now allows either role (was
 * admin-only); 0042_teacher_timetable_write.sql is the matching RLS
 * widening behind this app-level gate, same relationship every other
 * admin-write action in this app already has to its own RLS policy.
 */
export async function createTimetableEntryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin", "teacher");
  const parsed = entrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  if (parsed.data.end_time <= parsed.data.start_time) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("timetable_entries")
    .insert({
      class_id: parsed.data.class_id,
      subject_id: parsed.data.subject_id,
      teacher_id: parsed.data.teacher_id,
      day_of_week: parsed.data.day_of_week,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      room: parsed.data.room || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAuditEvent(me.id, "create_timetable_entry", "timetable_entries", created.id, parsed.data);

  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/teacher/timetable-builder");
  revalidatePath("/student/timetable");
  return {};
}

export async function deleteTimetableEntryAction(id: string) {
  const me = await requireRole("admin", "teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_timetable_entry", "timetable_entries", id);

  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/teacher/timetable-builder");
  revalidatePath("/student/timetable");
}
