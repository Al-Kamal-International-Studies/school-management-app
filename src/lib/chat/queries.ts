import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHiddenByFilter } from "@/lib/moderation";
import type { Profile, UserRole } from "@/lib/types/database.types";
import type { ChatDetail, ChatPerson, Contact, InboxItem, UiMessage } from "./types";

export const PAGE_SIZE = 80;

type GroupMeta = { title: string; subtitle: string; teacherId: string; classId: string };

/**
 * Display names for subject groups (subject · class, taught by …). Read with the
 * service role because a student can't always read every teacher/class row —
 * safe: callers pass only chat ids that came back from the user's own
 * RLS-scoped my_chats() / chats select.
 */
async function groupMeta(cstIds: string[]): Promise<Map<string, GroupMeta>> {
  const out = new Map<string, GroupMeta>();
  if (cstIds.length === 0) return out;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("class_subject_teachers").select("id, class_id, subject_id, teacher_id").in("id", cstIds);
  if (!rows?.length) return out;
  const [{ data: classes }, { data: subjects }, { data: teachers }] = await Promise.all([
    admin.from("classes").select("id, name, section").in("id", [...new Set(rows.map((r) => r.class_id))]),
    admin.from("subjects").select("id, name").in("id", [...new Set(rows.map((r) => r.subject_id))]),
    admin.from("profiles").select("id, full_name").in("id", [...new Set(rows.map((r) => r.teacher_id))]),
  ]);
  const cls = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const sub = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const tea = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
  for (const r of rows) {
    out.set(r.id, {
      title: `${sub.get(r.subject_id) ?? "Subject"} · ${cls.get(r.class_id) ?? ""}`,
      subtitle: tea.get(r.teacher_id) ?? "",
      teacherId: r.teacher_id,
      classId: r.class_id,
    });
  }
  return out;
}

async function people(ids: string[]): Promise<Map<string, ChatPerson>> {
  if (ids.length === 0) return new Map();
  const { data } = await createAdminClient().from("profiles").select("id, full_name, role, avatar_url").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [p.id, p as ChatPerson]));
}

/** The inbox: every chat I'm in, newest first, with unread counts. */
export const listInbox = cache(async (): Promise<InboxItem[]> => {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("my_chats");
  if (!rows?.length) return [];

  const [groups, persons] = await Promise.all([
    groupMeta(rows.filter((r) => r.kind === "group" && r.cst_id).map((r) => r.cst_id!)),
    people(rows.filter((r) => r.other_id).map((r) => r.other_id!)),
  ]);

  return rows.map((r) => {
    const g = r.cst_id ? groups.get(r.cst_id) : undefined;
    const p = r.other_id ? persons.get(r.other_id) : undefined;
    const preview = r.last_message_preview ?? "";
    return {
      id: r.chat_id,
      kind: r.kind,
      title: g?.title ?? p?.full_name ?? "—",
      subtitle: g?.subtitle ?? null,
      avatarUrl: p?.avatar_url ?? null,
      otherId: r.other_id,
      otherRole: p?.role ?? null,
      lastMessageAt: r.last_message_at,
      preview: preview && isHiddenByFilter(preview) ? null : preview,
      previewHidden: !!preview && isHiddenByFilter(preview),
      lastSenderId: r.last_sender_id,
      unread: r.unread,
    };
  });
});

// Who comes first in the contact row, per viewer: a teacher sees their
// students first (Muhammad, 2026-10-28), management last.
const CONTACT_ORDER: Record<UserRole, UserRole[]> = {
  teacher: ["student", "parent", "admin", "teacher"],
  student: ["teacher", "admin", "student", "parent"],
  parent: ["teacher", "admin", "student", "parent"],
  admin: ["teacher", "student", "parent", "admin"],
};

/** The people I may start a chat with — the round avatars across the top. */
export const listContacts = cache(async (viewerRole: UserRole): Promise<Contact[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_contacts");
  const rank = (r: UserRole) => CONTACT_ORDER[viewerRole].indexOf(r);
  return (data ?? [])
    .map((c) => ({ id: c.id, fullName: c.full_name, role: c.role, avatarUrl: c.avatar_url, context: c.context }))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.fullName.localeCompare(b.fullName));
});

export function toUiMessages(rows: { id: string; chat_id: string; sender_id: string; content: string; client_id: string; created_at: string }[]): UiMessage[] {
  return rows.map((m) => {
    const hidden = isHiddenByFilter(m.content);
    return {
      id: m.id,
      chatId: m.chat_id,
      senderId: m.sender_id,
      clientId: m.client_id,
      createdAt: m.created_at,
      content: hidden ? "" : m.content,
      hidden,
      status: "sent",
    };
  });
}

/** One chat with its newest messages, everyone's receipts and the member list. */
export async function getChatDetail(chatId: string, me: Profile): Promise<ChatDetail | null> {
  const supabase = await createClient();
  // RLS: returns nothing unless I'm a member
  const { data: chat } = await supabase.from("chats").select("*").eq("id", chatId).maybeSingle();
  if (!chat) return null;

  const [{ data: messages }, { data: receipts }, { data: canSend }] = await Promise.all([
    supabase.from("chat_messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: false }).limit(PAGE_SIZE),
    supabase.from("chat_receipts").select("*").eq("chat_id", chatId),
    supabase.rpc("can_send_in_chat", { p_chat_id: chatId, p_user: me.id }),
  ]);

  let title = "—";
  let subtitle: string | null = null;
  let avatarUrl: string | null = null;
  let otherId: string | null = null;
  let memberIds: string[];

  if (chat.kind === "group" && chat.cst_id) {
    const g = (await groupMeta([chat.cst_id])).get(chat.cst_id);
    title = g?.title ?? title;
    subtitle = g?.subtitle ?? null;
    const { data: students } = g
      ? await createAdminClient().from("students").select("id").eq("class_id", g.classId)
      : { data: [] as { id: string }[] };
    memberIds = [...(g ? [g.teacherId] : []), ...(students ?? []).map((s) => s.id)];
  } else {
    otherId = chat.user_a === me.id ? chat.user_b : chat.user_a;
    memberIds = [chat.user_a!, chat.user_b!];
  }

  const persons = await people([...memberIds, ...(messages ?? []).map((m) => m.sender_id)]);
  if (otherId) {
    title = persons.get(otherId)?.full_name ?? title;
    avatarUrl = persons.get(otherId)?.avatar_url ?? null;
  }

  const oversight = chat.kind === "direct" && chat.user_a !== me.id && chat.user_b !== me.id;
  if (oversight) {
    // both sides are "the other person" for an overseer
    title = [chat.user_a, chat.user_b].map((id) => persons.get(id!)?.full_name ?? "—").join(" · ");
    avatarUrl = null;
    otherId = null;
  }

  return {
    id: chat.id,
    kind: chat.kind,
    oversight,
    title,
    subtitle,
    avatarUrl,
    otherId,
    otherRole: otherId ? persons.get(otherId)?.role ?? null : null,
    canSend: canSend === true,
    // receipts count only real members (an admin peeking at a group doesn't
    // hold back the blue ticks)
    memberIds,
    people: Object.fromEntries(persons),
    messages: toUiMessages([...(messages ?? [])].reverse()),
    hasMore: (messages?.length ?? 0) === PAGE_SIZE,
    receipts: receipts ?? [],
  };
}
