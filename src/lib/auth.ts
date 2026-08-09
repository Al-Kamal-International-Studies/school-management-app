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
 * here is missed.
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

  return profile;
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
