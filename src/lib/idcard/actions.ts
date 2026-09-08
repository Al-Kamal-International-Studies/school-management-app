"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditIdCardPhoto } from "./authorizeIdCardAccess";

const urlSchema = z.string().url();

/**
 * Sets a student's ID card photo — writes the same `profiles.avatar_url`
 * shown everywhere else in the app (topbar, sidebar initials fallback,
 * etc.), not a separate id-card-specific column, so the ID card always
 * shows the same photo as the rest of the app rather than a second one
 * that can drift out of sync.
 *
 * Deliberately its own action rather than reusing profile/actions.ts's
 * setAvatarUrlAction: that one is hardcoded to the CALLER's own id
 * (getCurrentProfile().id) with no target-user parameter, since it only
 * ever needed to support "change your own avatar". This one accepts an
 * explicit `studentId` because a parent or admin updates a DIFFERENT
 * profile's row — the plain RLS "update your own profile" policy
 * (`id = auth.uid() or is_admin()`) doesn't cover a parent acting on their
 * child's row at all, so this goes through the service-role client with
 * its own explicit authorization check (canEditIdCardPhoto) instead of
 * relying on RLS to gate it.
 */
export async function setStudentPhotoAction(studentId: string, avatarUrl: string): Promise<{ error?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = urlSchema.safeParse(avatarUrl);
  if (!parsed.success) return { error: "Invalid image URL." };

  const allowed = await canEditIdCardPhoto(me, studentId);
  if (!allowed) return { error: "You don't have permission to change this student's photo." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ avatar_url: parsed.data }).eq("id", studentId);
  if (error) return { error: error.message };

  // Affects the topbar/sidebar avatar everywhere the changed profile is
  // shown, not just the id-card page that triggered it — a full-layout
  // revalidation, same as any other broadly-visible profile field change.
  revalidatePath("/", "layout");
  return {};
}
