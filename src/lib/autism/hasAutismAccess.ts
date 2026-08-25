import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database.types";

/**
 * Whether this account should see the Autism Section at all. Fixes a real
 * bug: the nav link was previously gated only by center (AKET), so EVERY
 * AKET parent saw "Autism Program" regardless of whether their own child
 * was actually enrolled in it — reported directly against a real
 * registration ("Muhammad"'s parent account had it available with nothing
 * autism-related about the child).
 *
 * Only parents need the extra check — admins see the whole program by
 * design (0033_autism_section.sql's confirmed decision), and a teacher with
 * zero assignments already gets a correct, harmless empty state on /autism
 * itself (not a data-shaped leak the way a parent seeing an unrelated
 * "Autism Program" section is). So this returns `true` immediately, with no
 * query at all, for every role except parent — same "only fetch this when
 * it can actually change anything" discipline already used elsewhere in
 * this app (see (dashboard)/layout.tsx's own comment on accessibleCenters).
 */
export async function hasAutismAccess(profile: Pick<Profile, "id" | "role">): Promise<boolean> {
  if (profile.role !== "parent") return true;

  const supabase = await createClient();
  const { data: links } = await supabase.from("parent_students").select("student_id").eq("parent_id", profile.id);
  const studentIds = [...new Set((links ?? []).map((l) => l.student_id))];
  if (studentIds.length === 0) return false;

  const { data: students } = await supabase.from("students").select("id").eq("is_autistic", true).in("id", studentIds);
  return (students ?? []).length > 0;
}
