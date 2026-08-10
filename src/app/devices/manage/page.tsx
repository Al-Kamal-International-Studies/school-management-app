import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie } from "@/lib/auth/deviceCookie";
import { AuthShell } from "@/components/auth/AuthShell";
import { DeviceManageList } from "./DeviceManageList";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/**
 * Reached via requireRole()'s requireDeviceApproved() gate (lib/auth.ts) —
 * either this account is already at its 3-device cap and this is a brand
 * new device, or a device that was approved got removed elsewhere while
 * this session stayed live. Deliberately does NOT call requireRole() on
 * itself (infinite redirect loop) — same pattern as /mfa/setup and
 * /force-password-change.
 */
export default async function DevicesManagePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const currentDeviceId = await getDeviceIdCookie();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", profile.id)
    .order("last_seen_at", { ascending: false });
  const devices = data ?? [];

  // Already resolved (e.g. someone else's removal already freed it up, or
  // this got hit some other way) — no need to make them click through.
  if (currentDeviceId && devices.some((d) => d.device_id === currentDeviceId)) {
    redirect(dashboardPathForRole(profile.role));
  }

  const dict = await getDictionary(await getLocale());

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.devices.manageTitle}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-navy-400">{dict.devices.manageMessage}</p>
      </div>
      <DeviceManageList devices={devices} currentDeviceId={currentDeviceId} />
    </AuthShell>
  );
}
