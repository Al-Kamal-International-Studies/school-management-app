"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

/** Marks a request dismissed without resetting anything — e.g. it turned
 * out to be spam, or the person contacted the school another way. Actually
 * resetting a password (which also resolves the matching request, if any)
 * happens from adminSetUserPasswordAction on the user's own detail page. */
export async function dismissPasswordResetRequestAction(id: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("password_reset_requests")
    .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: me.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "dismiss_password_reset_request", "password_reset_requests", id);
  revalidatePath("/admin/password-reset-requests");
}
