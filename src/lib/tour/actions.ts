"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks the guided tour as seen for the current account, so it doesn't
 * auto-trigger again on a future login (per-account, not per-device — see
 * 0027_tour_seen.sql). Called when the tour is finished OR explicitly
 * skipped; both count as "seen" so the app never nags on a normal login.
 *
 * Uses the regular RLS-scoped client, not the service-role admin client —
 * unlike must_change_password, has_seen_tour was deliberately left out of
 * the locked self-update column list (0017/0022's policy), since a user
 * flipping their own tour-seen flag has no security consequence.
 */
export async function markTourSeenAction(): Promise<void> {
  const me = await getCurrentProfile();
  if (!me) return;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ has_seen_tour: true }).eq("id", me.id);
  if (error) console.error("markTourSeenAction: failed to persist has_seen_tour:", error.message);
}
