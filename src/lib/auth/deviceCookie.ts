import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Low-level device-cookie/device-approval primitives, kept in their own
// module (rather than inside completeLogin.ts or lib/auth.ts directly) so
// both of those can depend on this without depending on each other —
// completeLogin.ts already needs dashboardPathForRole from lib/auth.ts, so
// lib/auth.ts importing back from completeLogin.ts would be circular.

export const DEVICE_COOKIE = "device_id";
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days — the same ceiling Chrome enforces and @supabase/ssr itself uses.
export const MAX_DEVICES = 3;

export async function getDeviceIdCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_COOKIE)?.value;
}

export async function setDeviceCookie(deviceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

/** Whether the given device_id is a registered device for this user. Pure
 * read, no redirect/side effect — callers decide what to do with the
 * answer (requireRole() redirects to /devices/manage; completeLogin
 * decides whether to register a new one). */
export async function isDeviceApproved(userId: string, deviceId: string | undefined): Promise<boolean> {
  if (!deviceId) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("user_devices").select("id").eq("user_id", userId).eq("device_id", deviceId).maybeSingle();
  return !!data;
}

/** A short, human-readable label from a raw User-Agent string — good enough
 * to tell devices apart in a list ("Chrome on Windows" vs "Safari on
 * iPhone"), not a full UA-parsing library. Shared by completeLogin.ts
 * (registering at login time) and /devices/manage (registering after
 * freeing up a slot). */
export function labelFromUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua) || /CriOS/.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return os ? `${browser} on ${os}` : browser;
}
