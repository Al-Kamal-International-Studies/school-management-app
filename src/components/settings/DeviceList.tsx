import { Laptop, MapPin } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie } from "@/lib/auth/deviceCookie";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { RemoveDeviceButton } from "./RemoveDeviceButton";

/**
 * The real device list (up to 3), each removable — this is what actually
 * makes "max 3 devices" a feature you can act on, not just a limit you hit.
 * Self-contained Server Component (fetches its own data) so it drops into
 * Settings without page.tsx needing to know about it.
 */
export async function DeviceList() {
  const me = await getCurrentProfile();
  if (!me) return null;

  const [currentDeviceId, dict, supabase] = await Promise.all([getDeviceIdCookie(), getDictionary(await getLocale()), createClient()]);
  const { data } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", me.id)
    .order("last_seen_at", { ascending: false });
  const devices = data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-navy-400">{dict.devices.settingsDescription}</p>
      {devices.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{dict.devices.noDevicesYet}</p>
      ) : (
        <ul className="space-y-2.5">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-navy-700 dark:bg-navy-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                  <Laptop className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {d.label ?? dict.common.unknown}
                    {d.device_id === currentDeviceId && (
                      <span className="ms-2 text-xs font-normal text-gold-600 dark:text-gold-400">({dict.devices.thisDevice})</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-navy-500">
                    {dict.devices.lastActive}: {new Date(d.last_seen_at).toLocaleString()}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 dark:text-navy-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{d.location ?? dict.devices.unknownLocation}</span>
                  </p>
                </div>
              </div>
              <RemoveDeviceButton id={d.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
