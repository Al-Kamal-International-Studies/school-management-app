"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database.types";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const updateSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  phone: z.string().optional(),
  // Only ever applied when the caller's role is "admin" — see below.
  // Everyone else's email/date_of_birth stay admin-managed, per the
  // profile-field-editability rules (item 6).
  email: z.string().email("Enter a valid email address.").optional(),
  date_of_birth: z.string().optional(),
});

/**
 * Lets the logged-in user edit their own name/phone (every role) — and, for
 * admins only, their own email and date of birth too (item 5's "Edit admin
 * profile fields including date of birth, email"). Relies on the "users can
 * update their own profile" RLS policy (id = auth.uid()); the role check
 * for email/DOB happens here in application code since RLS doesn't
 * distinguish which columns changed, only who's changing them.
 */
export async function updateOwnProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const updates: Partial<Profile> = { full_name: parsed.data.full_name, phone: parsed.data.phone || null };

  if (me.role === "admin") {
    if (parsed.data.date_of_birth) updates.date_of_birth = parsed.data.date_of_birth;

    if (parsed.data.email && parsed.data.email !== me.email) {
      // Goes through the service-role admin client (not a plain
      // auth.updateUser call) so the change applies immediately without an
      // email-confirmation round trip — matches how account creation
      // already uses createAdminClient() for privileged auth mutations.
      const admin = createAdminClient();
      const { error: authError } = await admin.auth.admin.updateUserById(me.id, {
        email: parsed.data.email,
        email_confirm: true,
      });
      if (authError) return { error: authError.message };
      updates.email = parsed.data.email;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", me.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

const avatarSchema = z.object({
  avatar_url: z.string().url(),
});

/**
 * Persists the public URL of an avatar the client already uploaded to the
 * "avatars" Storage bucket (upload happens client-side so we don't route
 * image bytes through a server action).
 */
export async function setAvatarUrlAction(avatarUrl: string): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = avatarSchema.safeParse({ avatar_url: avatarUrl });
  if (!parsed.success) return { error: "Invalid image URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: parsed.data.avatar_url }).eq("id", me.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
