import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database.types";

/**
 * Returns the logged-in user's profile, or null if not authenticated.
 * Safe to call from Server Components, layouts, and Server Actions.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
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
}

/**
 * Guards a Server Component / layout so only the given role(s) can render
 * it. Redirects unauthenticated users to /login, and authenticated users of
 * the wrong role to their own dashboard — this is enforced again by RLS at
 * the database layer, so a guessed URL can never leak data even if a guard
 * here is missed. Every role must clear must_change_password (see
 * /force-password-change) before anything else, and admins additionally
 * must complete MFA (see requireAdminMfaVerified below) — both checked here
 * (not just on specific routes) so neither can be dodged by visiting a
 * shared route like /settings or /profile instead.
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

  if (profile.role === "admin") {
    await requireAdminMfaVerified();
  }

  return profile;
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
