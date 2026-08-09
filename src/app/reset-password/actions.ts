"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { passwordZodSchema, MIN_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH_ADMIN } from "@/lib/security/password";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Completes a password reset. Previously this page called
 * `supabase.auth.updateUser({password})` directly from the browser with
 * only a client-side `password.length < 8` check — trivially bypassed by
 * calling the Supabase client from devtools. Routed through a Server Action
 * so the same centralized policy (docs/SECURITY.md F5) applies here too.
 *
 * Relies on the client having already called `supabase.auth.setSession()`
 * with the tokens from the reset-link URL (see page.tsx) — that establishes
 * the session cookie this action's server-side client reads.
 */
export async function completePasswordResetAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const minLength = profile?.role === "admin" ? MIN_PASSWORD_LENGTH_ADMIN : MIN_PASSWORD_LENGTH;

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

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  // Same reasoning as changeOwnPasswordAction (settings/actions.ts): a
  // password reset should invalidate whatever session(s) prompted it in
  // the first place (e.g. a compromised account). Best-effort.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("completePasswordResetAction: signOut(others) failed:", signOutError.message);

  return { success: true };
}
