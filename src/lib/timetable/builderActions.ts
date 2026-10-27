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

const entrySchema = z.object({
  id: z.string().guid().optional().or(z.literal("").transform(() => undefined)),
  return_to: z.enum(["/admin/timetable", "/teacher/timetable-builder"]).optional(),
  class_id: z.string().guid(),
  subject_id: z.string().guid(),
  teacher_id: z.string().guid(),
  day_of_week: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter an end time."),
  room: z.string().optional(),
});

/** Postgres exclusion-constraint names from 0044_timetable_no_overlaps.sql. */
function overlapMessage(message: string): string | null {
  if (message.includes("timetable_no_class_overlap")) return "This class already has a period at that time. Pick a free time slot.";
  if (message.includes("timetable_no_teacher_overlap")) return "This teacher is already teaching another class at that time. Pick a free time slot.";
  return null;
}

/**
 * Shared by both /admin/timetable and /teacher/timetable-builder — Muhammad,
 * chat, 2026-09-09: "give the teachers the exact same access for creating
 * timetables that the admins have." requireRole now allows either role (was
 * admin-only); 0042_teacher_timetable_write.sql is the matching RLS
 * widening behind this app-level gate, same relationship every other
 * admin-write action in this app already has to its own RLS policy.
 *
 * Creates a period, or edits one when the form carries its `id` (HANDOVER
 * Part 41: "give them the access to create (make changes)"). Overlaps are
 * checked here for a friendly message AND enforced by the database
 * (0044_timetable_no_overlaps.sql), which also catches two people saving at
 * the same moment.
 */
export async function saveTimetableEntryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    .select("id, class_id, teacher_id, start_time, end_time")
    .eq("day_of_week", parsed.data.day_of_week)
    .or(`class_id.eq.${parsed.data.class_id},teacher_id.eq.${parsed.data.teacher_id}`);
  const hhmm = (t: string) => t.slice(0, 5);
  const clash = (sameDay ?? []).find(
    (e) => e.id !== parsed.data.id && hhmm(e.start_time) < parsed.data.end_time && hhmm(e.end_time) > parsed.data.start_time
  );
  if (clash) {
    return {
      error:
        clash.class_id === parsed.data.class_id
          ? `This class already has a period from ${hhmm(clash.start_time)} to ${hhmm(clash.end_time)} that overlaps.`
          : `This teacher is already teaching another class from ${hhmm(clash.start_time)} to ${hhmm(clash.end_time)}.`,
    };
  }

  const row = {
    class_id: parsed.data.class_id,
    subject_id: parsed.data.subject_id,
    teacher_id: parsed.data.teacher_id,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    room: parsed.data.room || null,
  };
  const { id: editingId, return_to: returnTo, ...details } = parsed.data;

  const { data: saved, error } = editingId
    ? await supabase.from("timetable_entries").update(row).eq("id", editingId).eq("class_id", row.class_id).select("id").maybeSingle()
    : await supabase.from("timetable_entries").insert(row).select("id").single();

  if (error) return { error: overlapMessage(error.message) ?? error.message };
  if (!saved) return { error: "That period no longer exists. Refresh the page and try again." };

  await logAuditEvent(me.id, editingId ? "update_timetable_entry" : "create_timetable_entry", "timetable_entries", saved.id, details);

  revalidateTimetables();
  // Leave edit mode (drop ?edit=) once the change is saved.
  if (editingId && returnTo) redirect(`${returnTo}?class=${row.class_id}`);
  return {};
}

function revalidateTimetables() {
  revalidatePath("/admin/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/teacher/timetable-builder");
  revalidatePath("/student/timetable");
}

export async function deleteTimetableEntryAction(id: string) {
  const me = await requireRole("admin", "teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_timetable_entry", "timetable_entries", id);

  revalidateTimetables();
}
