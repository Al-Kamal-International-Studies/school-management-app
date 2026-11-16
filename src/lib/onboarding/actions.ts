"use server";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_VERSION } from "./version";

/**
 * Marks the getting-started onboarding as finished for the current account,
 * so it doesn't auto-start again (per account, not per device). Sets
 * has_seen_tour and tour_version_seen together.
 *
 * Uses the regular RLS-scoped client, not the service-role client: these two
 * columns were deliberately left out of the locked self-update column list
 * (0017/0022 policy), since a user flipping their own onboarding state has no
 * security consequence. Replaces the old markTourSeenAction.
 */
export async function markOnboardingCompleteAction(): Promise<void> {
  const me = await requireSession();
  if (!me) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_tour: true, tour_version_seen: ONBOARDING_VERSION })
    .eq("id", me.id);
  if (error) console.error("markOnboardingCompleteAction: failed to persist onboarding state:", error.message);
}
