"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole, getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { notifyUsers } from "@/lib/notifications/notify";

export interface ActionState {
  error?: string;
}

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300MB — keep in sync with 0034_autism_videos_storage_limits.sql's file_size_limit, the real enforcement layer.

const uploadMetaSchema = z.object({
  student_id: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
});

/**
 * Uploads a daily video for an assigned student. `is_autism_teacher_of`
 * (via a plain table query, not the RLS-bypassing admin client) is checked
 * BEFORE the admin client is ever touched — that's the real gate here,
 * since createAdminClient() bypasses table RLS entirely and the Storage
 * bucket's own type/size limits (0034_autism_videos_storage_limits.sql)
 * don't know or care which student a file is "for".
 */
export async function uploadAutismVideoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher");

  const parsed = uploadMetaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a video to upload." };
  if (file.size > MAX_VIDEO_BYTES) return { error: "Video must be under 300MB." };
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return { error: "Use an MP4, MOV, or WebM video." };

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("autism_assignments")
    .select("id")
    .eq("teacher_id", me.id)
    .eq("student_id", parsed.data.student_id)
    .maybeSingle();
  if (!assignment) return { error: "You are not assigned to this student." };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from("autism-videos").upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: inserted, error: insertError } = await admin
    .from("autism_videos")
    .insert({
      student_id: parsed.data.student_id,
      uploaded_by: me.id,
      title: parsed.data.title || null,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    await admin.storage.from("autism-videos").remove([path]);
    return { error: insertError?.message ?? "Could not save the video." };
  }

  await logAuditEvent(me.id, "upload_autism_video", "autism_videos", inserted.id, {
    student_id: parsed.data.student_id,
    title: parsed.data.title ?? null,
  });

  // parent_students' own RLS only lets a caller read their own link row —
  // a teacher's session can't select another user's row, so the already-
  // in-scope admin client (used above for the upload itself) is reused
  // here too, only to resolve who to notify.
  const { data: parentLinks } = await admin.from("parent_students").select("parent_id").eq("student_id", parsed.data.student_id);
  const parentIds = [...new Set((parentLinks ?? []).map((l) => l.parent_id))];
  if (parentIds.length) {
    await notifyUsers(parentIds, {
      type: "autism_video",
      title: parsed.data.title || "New video update",
      body: `${me.full_name} uploaded a new video.`,
      url: `/autism/video/${inserted.id}`,
    });
  }

  revalidatePath(`/autism/${parsed.data.student_id}`);
  revalidatePath("/autism");
  revalidatePath("/parent");

  return {};
}

const commentSchema = z.object({
  video_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

/**
 * Posts a comment into a video's thread. Admins are deliberately never
 * allowed here (product decision — view-only), enforced both by this
 * explicit pre-check (a clean error, not just an opaque RLS rejection) and
 * by can_comment_on_autism_video()'s RLS policy as the real backstop.
 */
export async function postAutismCommentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = commentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid comment." };

  const supabase = await createClient();
  const { data: video } = await supabase.from("autism_videos").select("*").eq("id", parsed.data.video_id).single();
  if (!video) return { error: "Video not found." };

  let allowed = false;
  if (me.role === "teacher") {
    const { data } = await supabase
      .from("autism_assignments")
      .select("id")
      .eq("teacher_id", me.id)
      .eq("student_id", video.student_id)
      .maybeSingle();
    allowed = !!data;
  } else if (me.role === "parent") {
    const { data } = await supabase.from("parent_students").select("id").eq("parent_id", me.id).eq("student_id", video.student_id).maybeSingle();
    allowed = !!data;
  }
  if (!allowed) return { error: "You can't comment on this video." };

  const { data: priorComments } = await supabase.from("autism_video_comments").select("author_id").eq("video_id", parsed.data.video_id);

  const { data: inserted, error } = await supabase
    .from("autism_video_comments")
    .insert({ video_id: parsed.data.video_id, author_id: me.id, content: parsed.data.content })
    .select("id")
    .single();
  if (error || !inserted) return { error: error?.message ?? "Could not post the comment." };

  await logAuditEvent(me.id, "comment_autism_video", "autism_video_comments", inserted.id, { video_id: parsed.data.video_id });

  const priorAuthorIds = (priorComments ?? []).map((c) => c.author_id);
  const otherParticipants = [...new Set([video.uploaded_by, ...priorAuthorIds])].filter((id) => id !== me.id);
  if (otherParticipants.length) {
    await notifyUsers(otherParticipants, {
      type: "autism_video_comment",
      title: `${me.full_name} commented`,
      body: parsed.data.content.slice(0, 120),
      url: `/autism/video/${parsed.data.video_id}`,
    });
  }

  revalidatePath(`/autism/video/${parsed.data.video_id}`);
  return {};
}
