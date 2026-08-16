import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Center } from "@/lib/types/database.types";

/**
 * Every center a profile has been granted access to (see
 * profile_center_access, added by 0027_centers.sql), ordered by name. Every
 * profile has at least one row here (its home center, backfilled for every
 * pre-existing account by that migration); more than one means a
 * multi-center account — the only case the center-switcher UI renders for.
 */
export async function getAccessibleCenters(profileId: string): Promise<Center[]> {
  const supabase = await createClient();

  const { data: grants } = await supabase.from("profile_center_access").select("center_id").eq("profile_id", profileId);
  const centerIds = (grants ?? []).map((g) => g.center_id);
  if (centerIds.length === 0) return [];

  const { data: centers } = await supabase.from("centers").select("*").in("id", centerIds).order("name");
  return centers ?? [];
}
