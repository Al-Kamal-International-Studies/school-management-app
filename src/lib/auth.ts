import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie, isDeviceApproved } from "@/lib/auth/deviceCookie";
import type { Profile, UserRole } from "@/lib/types/database.types";

/**
 * Returns the logged-in user's profile, or null if not authenticated.
 * Safe to call from Server Components, layouts, and Server Actions.
 *
 * Wrapped in React's `cache()` (see
 * node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
 * §"Deduplicating requests") so multiple calls within the same request share
 * one result instead of re-querying Supabase. This matters a lot here: every
 * single dashboard navigation was previously calling this 3 times —
 * (dashboard)/layout.tsx, the role layout's requireRole(), and then the page
 * itself — each call doing a network round trip to Supabase Auth
 * (auth.getUser() revalidates the JWT against the Auth server, it's not a
 * free local read like getSession()) *plus* a `profiles` select. That's up
 * to 6 sequential round trips of pure duplicate work before a page's own
 * data queries even start. `cache()` collapses that to 1 call's worth of
 * round trips per request; the other 2 call sites resolve instantly from
 * the memoized promise. Request-scoped only (per React's docs), so this
 * never leaks data between users/requests.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});

/**
 * Guards a Server Component / layout so only the given role(s) can render
 * it. Redirects unauthenticated users to /login, and authenticated users of
 * the wrong role to their own dashboard — this is enforced again by RLS at
 * the database layer, so a guessed URL can never leak data even if a guard
 * here is missed. Every role must clear must_change_password (see
 * /force-password-change) and be on a registered device (see
 * requireDeviceApproved below) before anything else, and admins
 * additionally must complete MFA (see requireAdminMfaVerified below) — all
 * checked here (not just on specific routes) so none of them can be dodged
 * by visiting a shared route like /settings or /profile instead. Last, a
 * one-time skippable passkey setup nudge (see requirePasskeyPromptResolved
 * below) — deliberately the last check, since it's an onboarding nudge, not
 * a security requirement like everything above it.
 */
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login?error=account_deactivated");
  }

  if (!roles.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role));
  }

  if (profile.must_change_password) {
    redirect("/force-password-change");
  }

  await requireDeviceApproved(profile.id);

  if (profile.role === "admin") {
    await requireAdminMfaVerified();
  }

  await requirePasskeyPromptResolved(profile);

  return profile;
}

/**
 * Redirects to /devices/manage if the current browser isn't one of this
 * user's registered devices. Two ways to land here: hitting the 3-device
 * cap at login (completeLogin.ts routes here directly instead of the
 * dashboard), or a device that WAS registered getting removed (from
 * Settings, on another device) while this session is still live — Supabase
 * has no way to force-expire that specific other session's token (see
 * lib/auth/accountAccess.ts's doc comment for the same platform
 * limitation), so this check is what actually makes "remove a device" mean
 * something: the next time that device navigates anywhere, it lands here
 * instead of the dashboard.
 */
async function requireDeviceApproved(userId: string): Promise<void> {
  const deviceId = await getDeviceIdCookie();
  if (!(await isDeviceApproved(userId, deviceId))) {
    redirect("/devices/manage");
  }
}

/**
 * Redirects an admin to /mfa/setup (no factor enrolled yet — mandatory
 * first-time setup) or /mfa/verify (factor exists, this session hasn't
 * verified it yet) until they're at aal2. Never called for non-admins.
 *
 * Fails OPEN, not closed, on an error from the AAL check itself (e.g. a
 * transient Supabase Auth hiccup) — logged, not thrown. This is a
 * deliberate choice: an availability outage in one Auth sub-API turning
 * into "the admin cannot get into their own school's app at all" is a
 * worse failure mode than skipping the MFA gate for that one request.
 * Every other layer (RLS, requireRole's own role/is_active checks) still
 * fully applies regardless.
 */
export async function requireAdminMfaVerified(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || !data) {
    console.error("requireAdminMfaVerified: AAL check failed, failing open:", error?.message);
    return;
  }

  if (data.currentLevel === "aal2") return;

  redirect(data.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/setup");
}

/**
 * Redirects to /setup-passkey once, for an account that's already past
 * every actual security gate above (must_change_password cleared, device
 * approved, MFA verified if admin) but has never registered a WebAuthn
 * credential and hasn't dismissed the suggestion — a one-time, skippable
 * nudge, not a requirement. Checks profile.passkey_prompt_dismissed_at
 * first (already loaded on `profile`, no extra query) so a dismissal or a
 * registered credential both short-circuit this on every request after the
 * first; only an account that has neither incurs the extra
 * webauthn_credentials lookup, the same "cheap once resolved" shape as
 * requireDeviceApproved above.
 */
async function requirePasskeyPromptResolved(profile: Profile): Promise<void> {
  if (profile.passkey_prompt_dismissed_at) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("webauthn_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  if ((count ?? 0) === 0) {
    redirect("/setup-passkey");
  }
}

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "parent":
      return "/parent";
  }
}
