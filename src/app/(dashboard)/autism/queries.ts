import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database.types";

export interface AutismStudentSummary {
  studentId: string;
  studentName: string;
  latestVideo: { id: string; title: string | null; created_at: string } | null;
}

/**
 * Teacher's own assigned students (current autism_assignments rows only —
 * see 0033_autism_section.sql's header comment on unassignment semantics),
 * each with its latest video, for the /autism index page.
 */
export async function listMyAutismStudents(teacherId: string): Promise<AutismStudentSummary[]> {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("autism_assignments").select("student_id").eq("teacher_id", teacherId);
  if (!assignments || assignments.length === 0) return [];

  const studentIds = [...new Set(assignments.map((a) => a.student_id))];
  const [{ data: profiles }, { data: videos }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("autism_videos").select("id, student_id, title, created_at").in("student_id", studentIds).order("created_at", { ascending: false }),
  ]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const latestByStudent = new Map<string, { id: string; title: string | null; created_at: string }>();
  for (const v of videos ?? []) {
    if (!latestByStudent.has(v.student_id)) latestByStudent.set(v.student_id, { id: v.id, title: v.title, created_at: v.created_at });
  }

  return studentIds.map((id) => ({
    studentId: id,
    studentName: nameMap.get(id) ?? "Unknown",
    latestVideo: latestByStudent.get(id) ?? null,
  }));
}

/** The student ids linked to this parent (same shape as parent/queries.ts's listMyChildren, id-only). */
async function myChildIds(parentId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: links } = await supabase.from("parent_students").select("student_id").eq("parent_id", parentId);
  return [...new Set((links ?? []).map((l) => l.student_id))];
}

/**
 * Full video history for one student, gated by an explicit access check
 * (mirrors class-chat/queries.ts's getChannel — checked here in app code,
 * not just left to RLS, so a wrong/foreign id can 404 cleanly instead of
 * relying on an empty-result fallthrough). Shared by the teacher's
 * /autism/[studentId] page (upload + full history) and the parent's
 * /autism index page (read-only history for each linked child).
 */
export async function getStudentAutismFeed(studentId: string, me: Profile) {
  const supabase = await createClient();

  let isTeacher = false;
  let isParent = false;

  if (me.role === "teacher") {
    const { data } = await supabase.from("autism_assignments").select("id").eq("teacher_id", me.id).eq("student_id", studentId).maybeSingle();
    isTeacher = !!data;
  } else if (me.role === "parent") {
    const childIds = await myChildIds(me.id);
    isParent = childIds.includes(studentId);
  }

  if (!isTeacher && !isParent && me.role !== "admin") return null;

  // parent_students' own RLS policy only lets a caller select rows where
  // THEY are the parent (parent_id = auth.uid()) — a teacher's session
  // can't read another user's link row. Access to this student was already
  // verified above via isTeacher/isParent, so the admin client is used
  // here only to resolve which parent(s) to show/message, not as a way to
  // skip that check.
  const admin = createAdminClient();
  const [{ data: studentProfile }, { data: videos }, { data: parentLinks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", studentId).single(),
    supabase.from("autism_videos").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    admin.from("parent_students").select("parent_id").eq("student_id", studentId),
  ]);
  if (!studentProfile) return null;

  const parentIds = [...new Set((parentLinks ?? []).map((l) => l.parent_id))];
  const { data: parentProfiles } = parentIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", parentIds)
    : { data: [] };

  return {
    student: studentProfile,
    videos: videos ?? [],
    parents: parentProfiles ?? [],
    isTeacher,
    isParent,
  };
}

/**
 * The most recent video for a student, for the parent dashboard widget.
 * Returns null when there are none — the caller renders nothing in that
 * case (see parent/page.tsx).
 */
export async function getLatestAutismVideo(studentId: string) {
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("autism_videos")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!video) return null;

  const { data: latestComment } = await supabase
    .from("autism_video_comments")
    .select("content, author_id, created_at")
    .eq("video_id", video.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { video, latestComment: latestComment ?? null };
}

/**
 * Full detail for one video — the shared thread page for teacher/parent
 * (and, incidentally, admin, who can always read but never see a comment
 * box — see CommentThread.tsx). Explicit access check (same reasoning as
 * getStudentAutismFeed above), not just an RLS-empty-result fallthrough.
 */
export async function getAutismVideoDetail(videoId: string, me: Profile) {
  const supabase = await createClient();
  const { data: video } = await supabase.from("autism_videos").select("*").eq("id", videoId).single();
  if (!video) return null;

  let isTeacher = false;
  let isParent = false;

  if (me.role === "teacher") {
    const { data } = await supabase
      .from("autism_assignments")
      .select("id")
      .eq("teacher_id", me.id)
      .eq("student_id", video.student_id)
      .maybeSingle();
    isTeacher = !!data;
  } else if (me.role === "parent") {
    const childIds = await myChildIds(me.id);
    isParent = childIds.includes(video.student_id);
  }

  const isUploader = video.uploaded_by === me.id;
  const isAdmin = me.role === "admin";
  if (!isTeacher && !isParent && !isUploader && !isAdmin) return null;

  const [{ data: student }, { data: uploader }, { data: comments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", video.student_id).single(),
    supabase.from("profiles").select("id, full_name").eq("id", video.uploaded_by).single(),
    supabase.from("autism_video_comments").select("*").eq("video_id", videoId).order("created_at", { ascending: true }),
  ]);

  const authorIds = [...new Set((comments ?? []).map((c) => c.author_id))];
  const { data: authors } = authorIds.length ? await supabase.from("profiles").select("id, full_name, role").in("id", authorIds) : { data: [] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

  return {
    video,
    student: student ?? null,
    uploader: uploader ?? null,
    comments: (comments ?? []).map((c) => ({ ...c, author: authorMap.get(c.author_id) ?? null })),
    // Admins are view-only per product decision — never allowed to comment
    // even though they can always read. See 0033_autism_section.sql's
    // can_comment_on_autism_video() for the matching RLS-side rule.
    canComment: isTeacher || isParent,
  };
}

/**
 * Parent(s) linked to a student, for the teacher's "Message Parent"
 * button(s). Same admin-client reasoning as getStudentAutismFeed above —
 * parent_students' own RLS only lets a caller read their own link row.
 * Callers are expected to have already verified the caller may act on this
 * student (e.g. via is_autism_teacher_of) before calling this.
 */
export async function getParentForStudent(studentId: string): Promise<Pick<Profile, "id" | "full_name">[]> {
  const admin = createAdminClient();
  const { data: links } = await admin.from("parent_students").select("parent_id").eq("student_id", studentId);
  const parentIds = [...new Set((links ?? []).map((l) => l.parent_id))];
  if (parentIds.length === 0) return [];
  const { data } = await admin.from("profiles").select("id, full_name").in("id", parentIds);
  return data ?? [];
}
