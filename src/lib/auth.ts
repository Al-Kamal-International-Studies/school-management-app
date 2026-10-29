import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDeviceIdCookie, isDeviceApproved } from "@/lib/auth/deviceCookie";
import { WEBAUTHN_LOGIN_VERIFIED_COOKIE } from "@/lib/webauthn/config";
import { isValidVerifiedMarker } from "@/lib/webauthn/verifiedMarker";
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
    redirect("/access-revoked");
  }

  if (!roles.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role));
  }

  await enforceSecurityGates(profile);

  await requirePasskeyPromptResolved(profile);

  return profile;
}

/**
 * The account-security gates every signed-in request must clear, whatever its
 * role: forced first-login password change, registered-device check (the
 * 3-device cap), and — for admins — MFA. Shared by requireRole() (pages) and
 * requireSession() (role-agnostic pages and Server Actions) so none of them can
 * be skipped by reaching a shared route or calling a Server Action directly
 * (the 2026-10-02 audit found /profile, /messages, /class-chat and ~12 shared
 * actions were checking sign-in only — HANDOVER Part 33).
 */
const enforceSecurityGates = cache(async (profile: Profile): Promise<void> => {
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

  // Students are never forced to change their password on sign-in: they get
  // their login from a sheet via their teacher, and it must just work
  // (Muhammad, 2026-10-29, HANDOVER Part 44). They can still change it in
  // Settings.
  if (profile.must_change_password && profile.role !== "student") {
    redirect("/force-password-change");
  }

  await requireDeviceApproved(profile.id);

  if (profile.role === "admin") {
    await requireAdminMfaVerified(profile.id);
  }
});

/**
 * Like requireRole() for a page or Server Action that any signed-in role may
 * use (profile, messages, class chat, settings actions, notifications…):
 * redirects the signed-out / deactivated, and applies every security gate
 * above. It deliberately skips the one-time passkey NUDGE (not a security
 * requirement) so a background Server Action can never bounce a user to
 * /setup-passkey mid-request.
 */
export async function requireSession(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/access-revoked");
  }

  await enforceSecurityGates(profile);

  return profile;
}

/**
 * For (dashboard)/layout.tsx: every gate requireRole() applies (security gates
 * plus the passkey nudge), but role-agnostic. Run in the layout, BEFORE the
 * dashboard shell renders — otherwise the shell and the route's loading.tsx
 * stream to the browser first and the role layout's redirect to /mfa/verify
 * (or /setup-passkey…) only lands afterwards, showing a blink of the
 * dashboard (HANDOVER Part 40). The gates are cache()d per request, so the
 * role layout's requireRole() re-check costs nothing.
 */
export async function requireDashboardAccess(): Promise<Profile> {
  const profile = await requireSession();
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
export async function requireAdminMfaVerified(userId: string): Promise<void> {
  // The marker is a signed, user-bound, expiring token (see
  // lib/webauthn/verifiedMarker.ts) — a hand-set cookie value no longer works.
  const cookieStore = await cookies();
  if (isValidVerifiedMarker(cookieStore.get(WEBAUTHN_LOGIN_VERIFIED_COOKIE)?.value, userId)) return;

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
export async function requireAdminMfaChallengeIfEnrolled(): Promise<void> {
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
const requirePasskeyPromptResolved = cache(async (profile: Profile): Promise<void> => {
  // Teachers only, and not on day one (Muhammad, 2026-10-29, HANDOVER Part
  // 44): students, parents and admins are never interrupted (admins already
  // have authenticator 2FA). Anyone can still add a passkey in Settings.
  if (profile.role !== "teacher" || profile.passkey_prompt_dismissed_at) return;

  const supabase = await createClient();
  const [{ count }, { data: firstDevice }] = await Promise.all([
    supabase.from("webauthn_credentials").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("user_devices").select("first_seen_at").eq("user_id", profile.id).order("first_seen_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if ((count ?? 0) > 0) return;

  // "Using the app for a while" = their first device was registered at least
  // PASSKEY_PROMPT_AFTER_HOURS ago.
  const since = firstDevice ? Date.now() - Date.parse(firstDevice.first_seen_at) : 0;
  if (since >= PASSKEY_PROMPT_AFTER_HOURS * 3_600_000) {
    redirect("/setup-passkey");
  }
});

const PASSKEY_PROMPT_AFTER_HOURS = 48;

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
