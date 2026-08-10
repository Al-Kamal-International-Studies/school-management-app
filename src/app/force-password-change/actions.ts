"use server";

import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordZodSchema, MIN_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH_ADMIN } from "@/lib/security/password";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Completes the mandatory post-temp-password change (see requireRole()'s
 * must_change_password gate). No "current password" field here — unlike
 * settings/actions.ts's self-service change, the whole point of this page
 * is that the user just proved they know the temp password by signing in
 * with it a moment ago; asking for it again would be redundant.
 *
 * Sets the new password via the regular (session-scoped) client, but clears
 * must_change_password via the service-role client — that column is
 * deliberately pinned against direct self-service writes by the RLS policy
 * in 0022_account_security_columns.sql (same BOPLA-closing pattern as F1),
 * so this is the one legitimate path allowed to flip it, gated by having
 * already re-set the password successfully in the step just above.
 */
export async function completeForcedPasswordChangeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };
  if (!me.must_change_password) return { success: true };

  const minLength = me.role === "admin" ? MIN_PASSWORD_LENGTH_ADMIN : MIN_PASSWORD_LENGTH;
  const schema = z
    .object({
      password: passwordZodSchema(minLength),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("profiles").update({ must_change_password: false }).eq("id", me.id);

  return { success: true };
}
