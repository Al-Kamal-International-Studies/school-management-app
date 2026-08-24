import { createClient } from "@/lib/supabase/server";
import { AKET_CENTER_ID } from "@/lib/types/database.types";

/**
 * Every autism_assignments row, admin's view of the whole program — joined
 * with teacher/student names for display. No RLS-narrowing needed beyond
 * what the "admins manage autism assignments" policy already grants (a
 * logged-in admin can select every row here).
 */
export async function listAutismAssignments() {
  const supabase = await createClient();
  const { data: assignments } = await supabase.from("autism_assignments").select("*").order("created_at", { ascending: false });
  if (!assignments || assignments.length === 0) return [];

  const teacherIds = [...new Set(assignments.map((a) => a.teacher_id))];
  const studentIds = [...new Set(assignments.map((a) => a.student_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [...teacherIds, ...studentIds]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return assignments.map((a) => ({
    ...a,
    teacherName: nameMap.get(a.teacher_id) ?? "Unknown",
    studentName: nameMap.get(a.student_id) ?? "Unknown",
  }));
}

/** AKET-scoped students for the assignment dropdown. */
export async function listAutismStudentsForSelect() {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id");
  if (!students || students.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("center_id", AKET_CENTER_ID)
    .eq("role", "student")
    .in(
      "id",
      students.map((s) => s.id)
    )
    .order("full_name");

  return profiles ?? [];
}

/** AKET-scoped teachers for the assignment dropdown. */
export async function listAutismTeachersForSelect() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("center_id", AKET_CENTER_ID)
    .eq("role", "teacher")
    .order("full_name");
  return data ?? [];
}

/**
 * Every autism video across the whole program, newest first — admin's
 * "all videos" view. Joined with student/teacher names for display.
 */
export async function listAllAutismVideos() {
  const supabase = await createClient();
  const { data: videos } = await supabase.from("autism_videos").select("*").order("created_at", { ascending: false });
  if (!videos || videos.length === 0) return [];

  const studentIds = [...new Set(videos.map((v) => v.student_id))];
  const uploaderIds = [...new Set(videos.map((v) => v.uploaded_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [...studentIds, ...uploaderIds]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return videos.map((v) => ({
    ...v,
    studentName: nameMap.get(v.student_id) ?? "Unknown",
    uploaderName: nameMap.get(v.uploaded_by) ?? "Unknown",
  }));
}

/**
 * One video + its full thread, for the admin's read-only view — is_admin()
 * already grants a logged-in admin read access to every row here (see
 * 0033_autism_section.sql), so no extra access check is needed the way
 * autism/queries.ts's getAutismVideoDetail needs one for teacher/parent.
 * No comment-posting affordance is ever built on top of this — admins are
 * view-only by product decision.
 */
export async function getAdminAutismVideoDetail(videoId: string) {
  const supabase = await createClient();
  const { data: video } = await supabase.from("autism_videos").select("*").eq("id", videoId).single();
  if (!video) return null;

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
  };
}
