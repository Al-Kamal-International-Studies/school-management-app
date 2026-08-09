import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database.types";

export async function listMyConversations(myId: string) {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("dm_conversations")
    .select("*")
    .or(`participant_a.eq.${myId},participant_b.eq.${myId}`)
    .order("updated_at", { ascending: false });
  if (!conversations || conversations.length === 0) return [];

  const otherIds = conversations.map((c) => (c.participant_a === myId ? c.participant_b : c.participant_a));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role, avatar_url").in("id", otherIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return conversations.map((c) => {
    const otherId = c.participant_a === myId ? c.participant_b : c.participant_a;
    return { ...c, other: profileMap.get(otherId) ?? null };
  });
}

export async function getConversation(conversationId: string, myId: string) {
  const supabase = await createClient();
  const { data: conversation } = await supabase.from("dm_conversations").select("*").eq("id", conversationId).single();
  if (!conversation || (conversation.participant_a !== myId && conversation.participant_b !== myId)) return null;

  const otherId = conversation.participant_a === myId ? conversation.participant_b : conversation.participant_a;
  const { data: other } = await supabase.from("profiles").select("id, full_name, role, avatar_url").eq("id", otherId).single();

  const { data: messages } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return { conversation, other, messages: messages ?? [] };
}

/** People this user is allowed to start a new conversation with — mirrors the can_message() RLS helper. */
export async function listContactablePeople(me: Profile): Promise<Pick<Profile, "id" | "full_name" | "role">[]> {
  const supabase = await createClient();

  if (me.role === "admin") {
    const { data } = await supabase.from("profiles").select("id, full_name, role").neq("id", me.id).is("archived_at", null);
    return data ?? [];
  }

  if (me.role === "teacher") {
    const { data: assignments } = await supabase.from("class_subject_teachers").select("class_id").eq("teacher_id", me.id);
    const classIds = [...new Set((assignments ?? []).map((a) => a.class_id))];
    const studentIds = classIds.length
      ? (await supabase.from("students").select("id").in("class_id", classIds)).data?.map((s) => s.id) ?? []
      : [];
    const { data: admins } = await supabase.from("profiles").select("id, full_name, role").eq("role", "admin");
    const { data: students } = studentIds.length
      ? await supabase.from("profiles").select("id, full_name, role").in("id", studentIds)
      : { data: [] };

    let parents: Pick<Profile, "id" | "full_name" | "role">[] = [];
    if (studentIds.length) {
      const { data: links } = await supabase.from("parent_students").select("parent_id").in("student_id", studentIds);
      const parentIds = [...new Set((links ?? []).map((l) => l.parent_id))];
      if (parentIds.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, role").in("id", parentIds);
        parents = data ?? [];
      }
    }

    return [...(admins ?? []), ...(students ?? []), ...parents];
  }

  if (me.role === "parent") {
    const { data: links } = await supabase.from("parent_students").select("student_id").eq("parent_id", me.id);
    const studentIds = [...new Set((links ?? []).map((l) => l.student_id))];
    const classIds = studentIds.length
      ? [...new Set((await supabase.from("students").select("class_id").in("id", studentIds)).data?.map((s) => s.class_id).filter((id): id is string => !!id) ?? [])]
      : [];
    const { data: admins } = await supabase.from("profiles").select("id, full_name, role").eq("role", "admin");

    let teachers: Pick<Profile, "id" | "full_name" | "role">[] = [];
    if (classIds.length) {
      const { data: assignments } = await supabase.from("class_subject_teachers").select("teacher_id").in("class_id", classIds);
      const teacherIds = [...new Set((assignments ?? []).map((a) => a.teacher_id))];
      if (teacherIds.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, role").in("id", teacherIds);
        teachers = data ?? [];
      }
    }
    return [...(admins ?? []), ...teachers];
  }

  // student
  const { data: student } = await supabase.from("students").select("class_id").eq("id", me.id).single();
  const { data: admins } = await supabase.from("profiles").select("id, full_name, role").eq("role", "admin");
  let teachers: Pick<Profile, "id" | "full_name" | "role">[] = [];
  if (student?.class_id) {
    const { data: assignments } = await supabase.from("class_subject_teachers").select("teacher_id").eq("class_id", student.class_id);
    const teacherIds = [...new Set((assignments ?? []).map((a) => a.teacher_id))];
    if (teacherIds.length) {
      const { data } = await supabase.from("profiles").select("id, full_name, role").in("id", teacherIds);
      teachers = data ?? [];
    }
  }
  return [...(admins ?? []), ...teachers];
}
