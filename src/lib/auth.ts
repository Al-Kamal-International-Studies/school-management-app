import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie, isDeviceApproved } from "@/lib/auth/deviceCookie";
import { WEBAUTHN_LOGIN_VERIFIED_COOKIE } from "@/lib/webauthn/config";
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

  // An admin who already has a real MFA factor enrolled must clear that
  // challenge (reach aal2) before force-password-change is even attempted —
  // Supabase's own Auth API rejects auth.updateUser({password}) at aal1
  // once any factor exists, regardless of *why* the password is being
  // changed ("AAL2 session is required to update email or password when
  // MFA is enabled"). This only bites an admin whose password was
  // reset/rotated *after* they'd already completed real enrollment (found
  // live, 2026-08-24, rotating admin@/muhammad@'s passwords — see
  // HANDOVER.md Part 13). A brand-new admin has no factor yet, so this is a
  // no-op for them and must_change_password below still runs first exactly
  // as before, with first-time MFA setup happening afterward via
  // requireAdminMfaVerified() further down.
  if (profile.role === "admin" && profile.must_change_password) {
    await requireAdminMfaChallengeIfEnrolled();
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
 * verified it yet) until they're at aal2 — UNLESS this session was just
 * established via a verified passkey/biometric login instead of a
 * password, in which case that already stands in for the TOTP step-up (see
 * WEBAUTHN_LOGIN_VERIFIED_COOKIE's doc comment for the full reasoning: a
 * verified WebAuthn assertion is itself a real second factor, and this
 * app's custom WebAuthn bridge never touches Supabase's own aal2, so
 * without this check a passkey login would always still demand a
 * redundant TOTP code on top of it). Checked first, and takes priority
 * over the AAL check below when present — no network round trip needed to
 * know an admin who just did a real biometric ceremony doesn't also need
 * to type a code. Never called for non-admins.
 *
 * The AAL check itself fails OPEN, not closed, on an error (e.g. a
 * transient Supabase Auth hiccup) — logged, not thrown. This is a
 * deliberate choice: an availability outage in one Auth sub-API turning
 * into "the admin cannot get into their own school's app at all" is a
 * worse failure mode than skipping the MFA gate for that one request.
 * Every other layer (RLS, requireRole's own role/is_active checks) still
 * fully applies regardless.
 */
export async function requireAdminMfaVerified(): Promise<void> {
  const cookieStore = await cookies();
  if (cookieStore.get(WEBAUTHN_LOGIN_VERIFIED_COOKIE)?.value === "1") return;

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
 * Narrower cousin of requireAdminMfaVerified(), called only when an admin
 * still has must_change_password = true. Checks Supabase's *real* AAL
 * status directly — deliberately does NOT honor the
 * WEBAUTHN_LOGIN_VERIFIED_COOKIE short-circuit requireAdminMfaVerified()
 * uses, because that cookie only affects whether *this app* treats the
 * session as fully authenticated; Supabase's own auth.updateUser() call
 * (in force-password-change/actions.ts) enforces its aal2 requirement
 * server-side regardless of what this app believes, so a passkey-logged-in
 * admin with an existing TOTP factor would still hit the same failure if
 * this check deferred to that cookie.
 *
 * If no factor is enrolled yet (data.nextLevel !== "aal2"), this is a
 * no-op — a genuinely new admin still goes through must_change_password
 * first and /mfa/setup afterward, exactly as before this fix. Same
 * fail-open-on-error reasoning as requireAdminMfaVerified(): a transient
 * Auth API hiccup here must not turn into "can't get into the account at
 * all, ever."
 */
async function requireAdminMfaChallengeIfEnrolled(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || !data) {
    console.error("requireAdminMfaChallengeIfEnrolled: AAL check failed, failing open:", error?.message);
    return;
  }

  if (data.currentLevel === "aal2") return;
  if (data.nextLevel !== "aal2") return;

  redirect("/mfa/verify");
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
