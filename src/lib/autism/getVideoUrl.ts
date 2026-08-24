"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Same two-step, RLS-then-service-role pattern as
 * lib/documents/getDocumentUrl.ts: first confirm (with the regular client,
 * so RLS/can_read_autism_video() applies) that the caller is actually
 * allowed to see this video, then — only if so — use the service-role
 * client to mint a short-lived signed URL for the private "autism-videos"
 * bucket. Never returns a URL for a video the caller isn't authorized to
 * see.
 */
export async function getAutismVideoUrlAction(videoId: string): Promise<{ url?: string; error?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: video } = await supabase.from("autism_videos").select("file_path").eq("id", videoId).single();
  if (!video) return { error: "Video not found." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("autism-videos").createSignedUrl(video.file_path, 300);
  if (error || !data) return { error: error?.message ?? "Could not generate a playback link." };

  return { url: data.signedUrl };
}
