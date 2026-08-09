"use server";

import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Self-service password change — any role. Uses the regular (non-admin)
 * Supabase client so it only ever affects the currently-authenticated
 * user's own account (supabase.auth.updateUser always targets the caller).
 */
export async function changeOwnPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
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
