import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Center } from "@/lib/types/database.types";

/**
 * Every center a profile has been granted access to (see
 * profile_center_access, added by 0027_centers.sql), ordered by name. Every
 * profile has at least one row here (its home center, backfilled for every
 * pre-existing account by that migration); more than one means a
 * multi-center account — the only case the center-switcher UI renders for.
 *
 * Wrapped in React's `cache()` — the same request-scoped-dedup fix Part 6
 * already applied to `getCurrentProfile()` (lib/auth.ts), for the identical
 * reason: `(dashboard)/layout.tsx` calls this once on every authenticated
 * page load, and `getActiveCenterForRequest()` — called again by 25+ admin
 * pages/actions — called it a SECOND time on the same request, each call
 * being two full sequential Supabase round trips (profile_center_access,
 * then centers). That's 4 serial round trips spent re-deriving the exact
 * same answer, on every single admin page, before that page's own data
 * queries even started — found while investigating a real "the app is so
 * slow" report. `cache()` collapses the two calls into one.
 */
export const getAccessibleCenters = cache(async (profileId: string): Promise<Center[]> => {
  const supabase = await createClient();

  const { data: grants } = await supabase.from("profile_center_access").select("center_id").eq("profile_id", profileId);
  const centerIds = (grants ?? []).map((g) => g.center_id);
  if (centerIds.length === 0) return [];

  const { data: centers } = await supabase.from("centers").select("*").in("id", centerIds).order("name");
  return centers ?? [];
});
