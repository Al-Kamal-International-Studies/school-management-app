"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TOUR_VERSION } from "@/lib/tour/steps";

/**
 * Marks the guided tour as seen for the current account, so it doesn't
 * auto-trigger again on a future login (per-account, not per-device — see
 * 0029_tour_seen.sql). Called when the tour is finished OR explicitly
 * skipped; both count as "seen" so the app never nags on a normal login.
 * Covers both flows TourProvider can trigger: a first-ever full tour
 * (has_seen_tour was false) and a "what's new" partial replay for an
 * account that already finished the tour but is behind on
 * tour_version_seen (0032_tour_versioning_and_notifications.sql) — either
 * way, once this runs the account has seen everything through
 * CURRENT_TOUR_VERSION, so both columns are set together in one call.
 *
 * Uses the regular RLS-scoped client, not the service-role admin client —
 * unlike must_change_password, has_seen_tour/tour_version_seen were
 * deliberately left out of the locked self-update column list (0017/0022's
 * policy), since a user flipping their own tour-seen state has no security
 * consequence.
 */
export async function markTourSeenAction(): Promise<void> {
  const me = await getCurrentProfile();
  if (!me) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_tour: true, tour_version_seen: CURRENT_TOUR_VERSION })
    .eq("id", me.id);
  if (error) console.error("markTourSeenAction: failed to persist tour-seen state:", error.message);
}
