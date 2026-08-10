"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie, labelFromUserAgent, MAX_DEVICES } from "@/lib/auth/deviceCookie";

export interface ActionState {
  error?: string;
}

/** Removes one of the caller's own registered devices — RLS-scoped (the
 * "users can remove their own devices" policy in
 * 0024_user_devices.sql), so this can never touch another user's row even
 * if a wrong id were somehow passed. If the removed row happens to be the
 * device making this exact request, requireDeviceApproved() will catch
 * that on its very next navigation and send it back here — see
 * lib/auth.ts's doc comment on requireDeviceApproved for why that's the
 * honest, actually-possible behavior given the platform's constraints. */
export async function removeDeviceAction(id: string) {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.from("user_devices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/devices/manage");
  revalidatePath("/settings");
}

/** Registers the current browser as one of this account's devices, then
 * continues on to the dashboard — the "free a slot, then continue" second
 * half of the /devices/manage flow. */
export async function registerCurrentDeviceAction(_prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const deviceId = await getDeviceIdCookie();
  if (!deviceId) {
    return { error: "Couldn't identify this device. Try signing in again." };
  }

  const supabase = await createClient();
  const { count } = await supabase.from("user_devices").select("id", { count: "exact", head: true }).eq("user_id", me.id);
  if ((count ?? 0) >= MAX_DEVICES) {
    return { error: "You're at the 3-device limit — remove one first." };
  }

  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const { error } = await supabase.from("user_devices").insert({
    user_id: me.id,
    device_id: deviceId,
    label: labelFromUserAgent(userAgent),
    user_agent: userAgent,
  });
  if (error) return { error: error.message };

  redirect(dashboardPathForRole(me.role));
}
