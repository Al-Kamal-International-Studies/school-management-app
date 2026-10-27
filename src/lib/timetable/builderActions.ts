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

const entrySchema = z.object({
  class_id: z.string().guid(),
  subject_id: z.string().guid(),
  teacher_id: z.string().guid(),
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

  // The class must exist in an accessible center AND the one currently being
  // worked in — `?class=<id>` is user-controlled, and a class id from the other
  // center used to be accepted (RLS only checks the role, see 0042).
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: klass } = await supabase.from("classes").select("center_id").eq("id", parsed.data.class_id).maybeSingle();
  if (!klass || klass.center_id !== activeCenterId) return { error: "Class not found." };

  // The subject/teacher pair must really be assigned to this class — the form's
  // hidden fields are client-controlled, and a tampered pair used to put a
  // teacher on a timetable for a class they never teach.
  const { data: assignment } = await supabase
    .from("class_subject_teachers")
    .select("id")
    .eq("class_id", parsed.data.class_id)
    .eq("subject_id", parsed.data.subject_id)
    .eq("teacher_id", parsed.data.teacher_id)
    .maybeSingle();
  if (!assignment) return { error: "That subject and teacher aren't assigned to this class." };

  // No overlapping periods: not for this class, and not for this teacher in any class.
  const { data: sameDay } = await supabase
    .from("timetable_entries")
    .select("class_id, teacher_id, start_time, end_time")
    .eq("day_of_week", parsed.data.day_of_week)
    .or(`class_id.eq.${parsed.data.class_id},teacher_id.eq.${parsed.data.teacher_id}`);
  const hhmm = (t: string) => t.slice(0, 5);
  const clash = (sameDay ?? []).find((e) => hhmm(e.start_time) < parsed.data.end_time && hhmm(e.end_time) > parsed.data.start_time);
  if (clash) {
    return {
      error:
        clash.class_id === parsed.data.class_id
          ? `This class already has a period from ${hhmm(clash.start_time)} to ${hhmm(clash.end_time)} that overlaps.`
          : `This teacher is already teaching another class from ${hhmm(clash.start_time)} to ${hhmm(clash.end_time)}.`,
    };
  }

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
