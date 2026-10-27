import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";

export interface PendingResetRequest {
  id: string;
  email: string;
  created_at: string;
  /** Resolved profile id for this email, if one still exists — lets the
   * inbox link straight to the account (or omit the link if the account
   * was archived/removed since the request came in). */
  profileId: string | null;
}

export async function listPendingPasswordResetRequests(): Promise<PendingResetRequest[]> {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("password_reset_requests")
    .select("id, email, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) return [];

  // Only requests for accounts that can actually use this app — AKIS
  // (HANDOVER Part 37). Resolved with the service-role client because both
  // profiles (D3) and profile_center_access RLS are narrower than "every
  // account an admin may act on"; this page is admin-only (layout guard).
  const admin = createAdminClient();
  const emails = [...new Set(requests.map((r) => r.email))];
  const { data: profiles } = await admin.from("profiles").select("id, email").in("email", emails);
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: grants } =
    ids.length > 0
      ? await admin.from("profile_center_access").select("profile_id").eq("center_id", AKIS_CENTER_ID).in("profile_id", ids)
      : { data: [] as { profile_id: string }[] };
  const akisIds = new Set((grants ?? []).map((g) => g.profile_id));
  const profileByEmail = new Map((profiles ?? []).filter((p) => akisIds.has(p.id)).map((p) => [p.email, p.id]));

  return requests.filter((r) => profileByEmail.has(r.email)).map((r) => ({ ...r, profileId: profileByEmail.get(r.email) ?? null }));
}
