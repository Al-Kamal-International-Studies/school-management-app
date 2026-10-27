"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { notifyUsers } from "@/lib/notifications/notify";

export interface ActionState {
  error?: string;
}

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB — keep in sync with 0039_lower_autism_video_size_limit.sql's file_size_limit, the real enforcement layer.

const VIDEO_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|mov|webm)$/;

const prepareUploadSchema = z.object({
  student_id: z.string().guid(),
  file_type: z.string(),
  file_size: z.number().int().positive(),
  file_name: z.string().max(300),
});

const finalizeUploadSchema = z.object({
  student_id: z.string().guid(),
  path: z.string().regex(VIDEO_PATH_RE),
  title: z.string().trim().max(200).optional(),
});

/** True when the signed-in teacher is the one assigned to this student (checked through the teacher's own RLS-scoped client). */
async function isAssignedTeacher(teacherId: string, studentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("autism_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}

/**
 * Step 1 of a video upload: validates the teacher, the student and the file's
 * declared type/size, and hands the browser a one-time signed upload URL so the
 * video goes STRAIGHT to Supabase Storage. It can't be posted through a Server
 * Action: those requests are capped (1 MB by default, ~4.5 MB on Vercel), so no
 * real video ever uploaded — found in the 2026-10-02 audit (HANDOVER Part 33).
 * The Storage bucket's own type/size limits (0034/0039) remain the real,
 * unbypassable enforcement.
 */
export async function prepareAutismVideoUploadAction(input: {
  student_id: string;
  file_type: string;
  file_size: number;
  file_name: string;
}): Promise<{ error?: string; path?: string; token?: string }> {
  const me = await requireRole("teacher");
  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request." };

  if (parsed.data.file_size > MAX_VIDEO_BYTES) return { error: "Video must be under 150MB." };
  if (!ALLOWED_VIDEO_TYPES.includes(parsed.data.file_type)) return { error: "Use an MP4, MOV, or WebM video." };
  if (!(await isAssignedTeacher(me.id, parsed.data.student_id))) return { error: "You are not assigned to this student." };

  const ext = parsed.data.file_type === "video/webm" ? "webm" : parsed.data.file_type === "video/quicktime" ? "mov" : "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("autism-videos").createSignedUploadUrl(path);
  if (error || !data) return { error: "Could not start the upload. Please try again." };
  return { path, token: data.token };
}

/**
 * Step 2: after the browser has uploaded the file, records it (title, who
 * uploaded it, size/type as REPORTED BY STORAGE, not by the browser), notifies
 * the parents and refreshes the lists. Re-checks everything — this action is
 * callable directly, so nothing from step 1 is trusted.
 */
export async function finalizeAutismVideoUploadAction(input: {
  student_id: string;
  path: string;
  title?: string;
}): Promise<ActionState> {
  const me = await requireRole("teacher");
  const parsed = finalizeUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request." };
  if (!(await isAssignedTeacher(me.id, parsed.data.student_id))) return { error: "You are not assigned to this student." };

  const admin = createAdminClient();
  const { path } = parsed.data;

  // The object must really be in the bucket; its size and MIME come from Storage itself.
  const { data: found } = await admin.storage.from("autism-videos").list("", { search: path, limit: 5 });
  const object = (found ?? []).find((o) => o.name === path);
  if (!object) return { error: "The video upload didn't complete. Please try again." };
  const size = Number((object.metadata as { size?: number } | null)?.size ?? 0);
  const mime = String((object.metadata as { mimetype?: string } | null)?.mimetype ?? "");
  if (!size || size > MAX_VIDEO_BYTES || !ALLOWED_VIDEO_TYPES.includes(mime)) {
    await admin.storage.from("autism-videos").remove([path]);
    return { error: "That file isn't an allowed video. Use an MP4, MOV, or WebM under 150MB." };
  }

  const { data: inserted, error: insertError } = await admin
    .from("autism_videos")
    .insert({
      student_id: parsed.data.student_id,
      uploaded_by: me.id,
      title: parsed.data.title || null,
      file_path: path,
      mime_type: mime,
      file_size: size,
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
  // in-scope admin client is reused here, only to resolve who to notify.
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
  video_id: z.string().guid(),
  content: z.string().trim().min(1).max(4000),
});

/**
 * Posts a comment into a video's thread. Admins are deliberately never
 * allowed here (product decision — view-only), enforced both by this
 * explicit pre-check (a clean error, not just an opaque RLS rejection) and
 * by can_comment_on_autism_video()'s RLS policy as the real backstop.
 */
export async function postAutismCommentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireSession();
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
