"use server";

import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { passwordZodSchema, MIN_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH_ADMIN } from "@/lib/security/password";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Self-service password change — any role. Uses the regular (non-admin)
 * Supabase client so it only ever affects the currently-authenticated
 * user's own account (supabase.auth.updateUser always targets the caller).
 * Minimum length is role-aware (admins hold more powerful accounts, so they
 * get the stricter 15-char floor) — see docs/SECURITY.md F5.
 */
export async function changeOwnPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const minLength = me.role === "admin" ? MIN_PASSWORD_LENGTH_ADMIN : MIN_PASSWORD_LENGTH;
  const passwordSchema = z
    .object({
      password: passwordZodSchema(minLength),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  // A changed password should invalidate any other session using the old
  // one — standard practice, and closes the gap noted in docs/SECURITY.md
  // §2 ("reset doesn't force-revoke other sessions"). Best-effort: the
  // password change itself already succeeded, so a failure here shouldn't
  // block returning success to the user.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("changeOwnPasswordAction: signOut(others) failed:", signOutError.message);

  return { success: true };
}

/** Signs out every session for this account except the current one. */
export async function signOutOtherSessionsAction(): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { error: error.message };

  return { success: true };
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/** Registers this browser for Web Push (free/VAPID — see src/lib/push/send.ts). */
export async function subscribeToPushAction(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = subscriptionSchema.safeParse({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  if (!parsed.success) return { error: "Invalid subscription." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: me.id, ...parsed.data }, { onConflict: "endpoint" });
  if (error) return { error: error.message };

  return { success: true };
}

export async function unsubscribeFromPushAction(endpoint: string) {
  const me = await getCurrentProfile();
  if (!me) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", me.id);
}
