import { createClient } from "@/lib/supabase/server";

/** Scoped to the active center — feedback has its own center_id (see 0030_feedback_center_id.sql), so this filters directly rather than via a join. */
export async function listAllFeedback(activeCenterId: string) {
  const supabase = await createClient();
  const { data: entries } = await supabase.from("feedback").select("*").eq("center_id", activeCenterId).order("created_at", { ascending: false });
  if (!entries || entries.length === 0) return [];

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, role").in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return entries.map((e) => ({ ...e, user: profileMap.get(e.user_id) ?? null }));
}
