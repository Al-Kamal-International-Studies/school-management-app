import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AKIS_CENTER_ID, DEMO_CENTER_ID } from "@/lib/types/database.types";

/**
 * True when this profile holds a profile_center_access grant for AKIS — the
 * only institution this app serves (HANDOVER Part 37). Accounts that only
 * ever belonged to the removed AKET center fail this, so they can neither
 * sign in (completeLogin.ts) nor keep using a session that predates the
 * removal ((dashboard)/layout.tsx).
 *
 * Uses the admin (service-role) client, like completeLogin's other
 * login-time checks: several of them run before a session exists, and it
 * keeps the result independent of how the profile_center_access RLS policy
 * happens to be shaped. cache()-wrapped so the layout and any page calling
 * it in the same request share one lookup.
 */
export const hasAkisAccess = cache(async (profileId: string): Promise<boolean> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profile_center_access")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("center_id", AKIS_CENTER_ID)
    .maybeSingle();
  return !!data;
});

/**
 * The center this profile signs in to: AKIS, or DEMO for the made-up school
 * Muhammad shows prospects (HANDOVER Part 45). null = no access, same as a
 * failed hasAkisAccess. DEMO counts only for teachers, students and parents:
 * admin pages read AKIS data directly (admissions, password resets…), so a
 * demo admin would see the real school — there is never a demo admin login.
 */
export const getAppCenterId = cache(async (profileId: string): Promise<string | null> => {
  if (await hasAkisAccess(profileId)) return AKIS_CENTER_ID;
  const supabase = createAdminClient();
  const [{ data: grant }, { data: profile }] = await Promise.all([
    supabase.from("profile_center_access").select("profile_id").eq("profile_id", profileId).eq("center_id", DEMO_CENTER_ID).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", profileId).maybeSingle(),
  ]);
  return grant && profile && profile.role !== "admin" ? DEMO_CENTER_ID : null;
});
