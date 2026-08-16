"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * "Maybe later" on /setup-passkey. Sets passkey_prompt_dismissed_at via the
 * regular session-scoped client — unlike must_change_password, this column
 * is deliberately left unpinned by 0028_passkey_prompt_dismissal.sql's own
 * doc comment, so a plain self-update is allowed (same as phone/avatar_url)
 * without needing the service-role client. Redirects straight to the
 * account's dashboard, same as completing setup would.
 */
export async function dismissPasskeyPromptAction(): Promise<never> {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  await supabase.from("profiles").update({ passkey_prompt_dismissed_at: new Date().toISOString() }).eq("id", me.id);

  redirect(dashboardPathForRole(me.role));
}
