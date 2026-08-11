import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dashboardPathForRole } from "@/lib/auth";
import { getDeviceIdCookie, setDeviceCookie, labelFromUserAgent, locationFromHeaders, MAX_DEVICES } from "@/lib/auth/deviceCookie";
import type { Profile } from "@/lib/types/database.types";

/**
 * Reads (or mints) this browser's device_id, and checks it against
 * user_devices — registers it if there's a free slot, otherwise leaves it
 * unregistered and reports the cap so the caller can route to
 * /devices/manage instead of the dashboard. Deliberately never signs the
 * user out here even when the cap is hit (see /devices/manage's own doc
 * comment) — the whole point is avoiding a re-auth chicken-and-egg problem.
 */
async function ensureDeviceRegistered(userId: string): Promise<"ok" | "limit_reached"> {
  const deviceId = (await getDeviceIdCookie()) ?? randomUUID();
  const supabase = await createClient();
  const headersList = await headers();

  const { data: existing } = await supabase
    .from("user_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    // Refreshes location too, not just the timestamp — a laptop that moved
    // from home to campus since it was first registered should read as
    // "currently at" its latest known location, not its very first one.
    await supabase
      .from("user_devices")
      .update({ last_seen_at: new Date().toISOString(), location: locationFromHeaders(headersList) })
      .eq("id", existing.id);
    await setDeviceCookie(deviceId);
    return "ok";
  }

  const { count } = await supabase.from("user_devices").select("id", { count: "exact", head: true }).eq("user_id", userId);

  // Sets the cookie either way — even at the cap, so /devices/manage reads
  // back the same device_id (rather than minting a different one on its
  // own next request) once the user frees up a slot there.
  await setDeviceCookie(deviceId);

  if ((count ?? 0) >= MAX_DEVICES) {
    return "limit_reached";
  }

  const userAgent = headersList.get("user-agent");
  await supabase.from("user_devices").insert({
    user_id: userId,
    device_id: deviceId,
    label: labelFromUserAgent(userAgent),
    user_agent: userAgent,
    location: locationFromHeaders(headersList),
  });

  return "ok";
}

/**
 * Everything that needs to happen immediately after a session is
 * established, regardless of how (password sign-in, or the WebAuthn login
 * bridge) — reset the failed-login counter, register/verify this browser's
 * device against the 3-device cap, and land on the right page. Always ends
 * by throwing via redirect(), so callers just `return completeLogin(...)`.
 * Assumes the caller already confirmed the account is active — this only
 * handles what's common to every successful login, not auth itself.
 */
export async function completeLogin(profile: Pick<Profile, "id" | "role" | "failed_login_attempts">, next?: string): Promise<never> {
  if (profile.failed_login_attempts > 0) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ failed_login_attempts: 0 }).eq("id", profile.id);
  }

  const deviceStatus = await ensureDeviceRegistered(profile.id);
  if (deviceStatus === "limit_reached") {
    redirect("/devices/manage");
  }

  redirect(next || dashboardPathForRole(profile.role));
}
