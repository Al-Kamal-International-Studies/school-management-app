"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
}

const eventSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  event_date: z.string().min(1, "Date is required."),
  event_type: z.enum(["event", "holiday", "deadline"]),
  audience: z.enum(["all", "teacher", "student"]),
});

export async function createEventAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({ ...parsed.data, description: parsed.data.description || null, created_by: me.id });
  if (error) return { error: error.message };

  revalidatePath("/admin/events");
  revalidatePath("/calendar");
  return {};
}

export async function deleteEventAction(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/calendar");
}
