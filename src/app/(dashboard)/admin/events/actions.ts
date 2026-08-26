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

const eventSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  event_date: z.string().min(1, "Date is required."),
  event_type: z.enum(["event", "holiday", "deadline"]),
  audience: z.enum(["all", "teacher", "student", "parent"]),
});

export async function createEventAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  // Without an explicit center_id, this insert falls back to the column's
  // schema default (AKIS — see 0027_centers.sql) regardless of which
  // center the admin is actually looking at. `me.center_id` is
  // deliberately NOT used here — that's the admin's own home center, not
  // necessarily the one they're currently working in.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, description: parsed.data.description || null, created_by: me.id, center_id: activeCenterId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "create_event", "events", created.id, { title: parsed.data.title, event_type: parsed.data.event_type });

  revalidatePath("/admin/events");
  revalidatePath("/calendar");
  return {};
}

export async function deleteEventAction(id: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_event", "events", id);
  revalidatePath("/admin/events");
  revalidatePath("/calendar");
}
