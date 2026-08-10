import "server-only";

import { createClient } from "@/lib/supabase/server";

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

  const emails = [...new Set(requests.map((r) => r.email))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("email", emails);
  const profileByEmail = new Map((profiles ?? []).map((p) => [p.email, p.id]));

  return requests.map((r) => ({ ...r, profileId: profileByEmail.get(r.email) ?? null }));
}
