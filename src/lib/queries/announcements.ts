import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Announcements visible to the current user. No audience filter is applied
 * here on purpose — the "announcements are readable by matching audience"
 * RLS policy already scopes results to `audience = 'all'` or the caller's
 * own role (or everything, for admins), so a plain select returns exactly
 * what should be shown.
 */
export async function listVisibleAnnouncements(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}
