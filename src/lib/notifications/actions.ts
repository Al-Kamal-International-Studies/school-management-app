"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marks one notification read — called when the bell dropdown's entry is
 * clicked, right before the Link navigates to its `url`. RLS
 * (0032_tour_versioning_and_notifications.sql) already scopes the update to
 * `user_id = auth.uid()`, so a foreign notification id just silently
 * updates zero rows rather than needing a manual ownership check here. */
export async function markNotificationReadAction(id: string): Promise<void> {
  const me = await getCurrentProfile();
  if (!me) return;

  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", me.id);
  revalidatePath("/", "layout");
}

/** "Mark all as read" — the bell dropdown's header action. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await getCurrentProfile();
  if (!me) return;

  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
  revalidatePath("/", "layout");
}
