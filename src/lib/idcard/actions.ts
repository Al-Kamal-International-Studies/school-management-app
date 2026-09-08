"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditIdCardPhoto } from "./authorizeIdCardAccess";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB, matches IdCardPhotoUpload.tsx's own client-side check

/**
 * Uploads a student's ID card photo AND writes the same
 * `profiles.avatar_url` shown everywhere else in the app (topbar, sidebar
 * initials fallback, etc.) — not a separate id-card-specific column, so
 * the ID card always shows the same photo as the rest of the app rather
 * than a second one that can drift out of sync.
 *
 * The actual Storage write deliberately happens HERE, server-side via the
 * service-role client, not in the browser the way
 * (dashboard)/profile/AvatarUpload.tsx's own upload does. Real bug found
 * live (Muhammad, chat, 2026-09-09: "trying to put an actual student's
 * photo... says new row violates row-level security policy"): the
 * `avatars` Storage bucket's own RLS policy only allows a user to write
 * inside a folder matching their OWN auth.uid()
 * (`(storage.foldername(name))[1] = auth.uid()::text`, 0003_profile_and_
 * avatars.sql) — correct and sufficient for AvatarUpload.tsx, which only
 * ever uploads to the CALLER's own folder, but this component uploads to
 * an arbitrary `studentId`'s folder on behalf of an admin or parent, which
 * that policy was never written to allow. Uploading through this action
 * instead — service-role bypasses Storage RLS entirely — mirrors exactly
 * how the `profiles.avatar_url` write below already has to use the
 * service-role client for the same underlying reason (a parent/admin
 * acting on a different profile's row isn't covered by the plain "update
 * your own profile" RLS policy either).
 */
export async function uploadStudentPhotoAction(studentId: string, formData: FormData): Promise<{ error?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const allowed = await canEditIdCardPhoto(me, studentId);
  if (!allowed) return { error: "You don't have permission to change this student's photo." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No image provided." };
  if (file.type !== "image/png") return { error: "Invalid image type." };
  if (file.size > MAX_SIZE_BYTES) return { error: "Image is too large." };

  const admin = createAdminClient();
  // Always .png — IdCardPhotoUpload.tsx forces outputFormat="png" on the
  // shared crop modal specifically so this is always pdf-lib-embeddable
  // (see generateIdCard.ts's own doc comment for why WEBP can't be).
  const path = `${studentId}/avatar.png`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, cacheControl: "3600", contentType: "image/png" });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path is
  // stable — same convention AvatarUpload.tsx's own upload already uses.
  const bustedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error } = await admin.from("profiles").update({ avatar_url: bustedUrl }).eq("id", studentId);
  if (error) return { error: error.message };

  // Affects the topbar/sidebar avatar everywhere the changed profile is
  // shown, not just the id-card page that triggered it — a full-layout
  // revalidation, same as any other broadly-visible profile field change.
  revalidatePath("/", "layout");
  return {};
}
