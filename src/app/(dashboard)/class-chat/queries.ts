import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database.types";

export interface SubjectChatChannel {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  lastMessageAt: string | null;
}

/**
 * Channels the current user belongs to: a teacher's own class_subject_teachers
 * assignments, or the channels for a student's current class (one channel per
 * subject taught to that class). Same join shape as teacher/queries.ts's
 * listMyClasses and student/queries.ts's getMySchedule — the channel IS the
 * class_subject_teachers row, so this never has to reconcile a separate
 * "channel" concept against the assignment it's really about.
 */
export async function listMyChannels(me: Profile): Promise<SubjectChatChannel[]> {
  const supabase = await createClient();

  let assignments;
  if (me.role === "teacher") {
    ({ data: assignments } = await supabase.from("class_subject_teachers").select("*").eq("teacher_id", me.id));
  } else if (me.role === "student") {
    const { data: student } = await supabase.from("students").select("class_id").eq("id", me.id).single();
    if (!student?.class_id) return [];
    ({ data: assignments } = await supabase.from("class_subject_teachers").select("*").eq("class_id", student.class_id));
  } else {
    return [];
  }

  if (!assignments || assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];
  const teacherIds = [...new Set(assignments.map((a) => a.teacher_id))];
  const channelIds = assignments.map((a) => a.id);

  const [{ data: classes }, { data: subjects }, { data: teachers }, { data: lastMessages }] = await Promise.all([
    supabase.from("classes").select("id, name, section").in("id", classIds),
    supabase.from("subjects").select("id, name").in("id", subjectIds),
    supabase.from("profiles").select("id, full_name").in("id", teacherIds),
    supabase.from("subject_chat_messages").select("channel_id, created_at").in("channel_id", channelIds).order("created_at", { ascending: false }),
  ]);

  const classMap = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

  // First row per channel_id wins — lastMessages is already sorted newest
  // first, so this picks up each channel's most recent message only.
  const lastMessageMap = new Map<string, string>();
  for (const m of lastMessages ?? []) {
    if (!lastMessageMap.has(m.channel_id)) lastMessageMap.set(m.channel_id, m.created_at);
  }

  return assignments
    .map((a) => ({
      id: a.id,
      class_id: a.class_id,
      subject_id: a.subject_id,
      teacher_id: a.teacher_id,
      className: classMap.get(a.class_id) ?? "Unknown",
      subjectName: subjectMap.get(a.subject_id) ?? "Unknown",
      teacherName: teacherMap.get(a.teacher_id) ?? "Unknown",
      lastMessageAt: lastMessageMap.get(a.id) ?? null,
    }))
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

/**
 * Full detail for one channel, gated the same way the RLS policy is
 * (is_subject_channel_member) so a wrong/foreign id 404s instead of leaking
 * whether it exists. Returns null for "not found" and "not a member" alike —
 * same shape messages/queries.ts's getConversation uses for the identical
 * reason.
 */
export async function getChannel(channelId: string, me: Profile) {
  const supabase = await createClient();
  const { data: channel } = await supabase.from("class_subject_teachers").select("*").eq("id", channelId).single();
  if (!channel) return null;

  const isTeacher = channel.teacher_id === me.id;
  let isMember = isTeacher;
  if (!isMember && me.role === "student") {
    const { data: student } = await supabase.from("students").select("class_id").eq("id", me.id).single();
    isMember = student?.class_id === channel.class_id;
  }
  if (!isMember && me.role !== "admin") return null;

  const [{ data: classRow }, { data: subject }, { data: teacher }, { data: messages }] = await Promise.all([
    supabase.from("classes").select("name, section").eq("id", channel.class_id).single(),
    supabase.from("subjects").select("name").eq("id", channel.subject_id).single(),
    supabase.from("profiles").select("full_name").eq("id", channel.teacher_id).single(),
    supabase.from("subject_chat_messages").select("*").eq("channel_id", channelId).order("created_at", { ascending: true }),
  ]);

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const { data: senders } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", senderIds)
    : { data: [] };
  const senderMap = new Map((senders ?? []).map((s) => [s.id, s]));

  return {
    channel,
    className: classRow ? `${classRow.name} - ${classRow.section}` : "Unknown",
    subjectName: subject?.name ?? "Unknown",
    teacherName: teacher?.full_name ?? "Unknown",
    isTeacher,
    messages: (messages ?? []).map((m) => ({ ...m, sender: senderMap.get(m.sender_id) ?? null })),
  };
}
