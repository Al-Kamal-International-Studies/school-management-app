import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dashboardPathForRole } from "@/lib/auth";
import { getDeviceIdCookie, setDeviceCookie, labelFromUserAgent, locationFromHeaders, MAX_DEVICES } from "@/lib/auth/deviceCookie";
import { recordRateLimitAttempt } from "@/lib/security/rateLimit";
import { safeNext } from "@/lib/auth/safeNext";
import { hasAkisAccess } from "@/lib/centers/hasAkisAccess";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";
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
 * Confirms this profile holds an AKIS access grant — the only institution
 * this app serves (AKET was removed, HANDOVER Part 37). Accounts that only
 * ever belonged to AKET fail here and get the same generic "incorrect email
 * or password" error as any other failed sign-in, so the response never
 * reveals that the account exists.
 */
async function verifyLoginCenter(profileId: string): Promise<string | null> {
  return (await hasAkisAccess(profileId)) ? AKIS_CENTER_ID : null;
}

/**
 * Everything that needs to happen immediately after a session is
 * established, regardless of how (password sign-in, or the WebAuthn login
 * bridge) — verify center access, reset the failed-login counter,
 * register/verify this browser's device against the 3-device cap, and land
 * on the right page. Callers just `return completeLogin(...)`: every path
 * either returns an `{ error }` result (center-access denial) or throws via
 * redirect() (every success path, plus the device-cap gate).
 *
 * Assumes the caller already confirmed the account is active — this only
 * handles what's common to every successful login, not auth itself.
 *
 * `centerDeniedMessage` is caller-supplied rather than a single hardcoded
 * string: password login and WebAuthn login already each have their own
 * pre-existing generic/anti-enumeration error message (loginAction's
 * "Incorrect email or password." vs. webauthnActions.ts's "No biometric
 * sign-in set up..."), and a center-access denial should be indistinguishable
 * from *that same surface's* normal failure mode, not swap in the other
 * surface's wording (which would itself be a small, avoidable tell that
 * something unusual happened on this specific attempt).
 */
export async function completeLogin(
  profile: Pick<Profile, "id" | "role" | "failed_login_attempts">,
  { email, centerDeniedMessage, next }: { email: string; centerDeniedMessage: string; next?: string }
): Promise<{ error?: string }> {
  if (profile.failed_login_attempts > 0) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ failed_login_attempts: 0 }).eq("id", profile.id);
  }

  const verifiedCenterId = await verifyLoginCenter(profile.id);
  if (!verifiedCenterId) {
    // Same bucket password/WebAuthn login already checked before this point
    // (not a fresh independent counter) — a center-mismatch attempt still
    // counts against the same 10-attempts/15-minute throttle a wrong
    // password would, so alternating between "wrong password" and "wrong
    // center" guesses against the same email can't be used to double an
    // attacker's effective attempt budget. Deliberately NOT the separate,
    // harsher failed_login_attempts/3-strikes account-deactivation counter
    // (lib/auth.ts's MAX_FAILED_ATTEMPTS, checked in login/actions.ts) —
    // that counter's whole purpose is tracking wrong *password* guesses, and
    // this is a correct password on the wrong center selection, a plausible
    // innocent mistake (shared computer, stale picker choice) rather than a
    // credential-guessing signal. Tripping permanent-until-admin-reactivates
    // deactivation off of a UI toggle would be a real, unnecessary
    // self-inflicted lockout risk for legitimate multi-account users.
    await recordRateLimitAttempt(`login:${email.toLowerCase()}`);

    // A real session WAS just established (password or WebAuthn both
    // succeed before completeLogin ever runs) — sign it back out so a
    // rejected login never leaves a live, usable session behind.
    const supabase = await createClient();
    await supabase.auth.signOut();

    return { error: centerDeniedMessage };
  }

  const deviceStatus = await ensureDeviceRegistered(profile.id);
  if (deviceStatus === "limit_reached") {
    redirect("/devices/manage");
  }

  redirect(safeNext(next) ?? dashboardPathForRole(profile.role));
}
