import { createClient } from "@/lib/supabase/server";

/** Latest notifications for the Topbar bell — fetched server-side (in
 * (dashboard)/layout.tsx, alongside profile/centers) and passed down as
 * props, the same shape as `centers`, since Topbar itself renders inside
 * DashboardShell's "use client" boundary and can't fetch on its own. */
export async function listMyNotifications(userId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
