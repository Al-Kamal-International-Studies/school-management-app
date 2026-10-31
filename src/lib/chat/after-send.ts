import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";
import { notifyUsers } from "@/lib/notifications/notify";
import { getAppCenterId } from "@/lib/centers/hasAkisAccess";
import type { ModerationResult } from "@/lib/moderation";
import type { ChatMessage, Profile } from "@/lib/types/database.types";

/**
 * Web Push to everyone else in the chat. Push only — no bell entry: the chat
 * icon's own unread badge is the in-app signal, so a busy group doesn't bury
 * every other notification. (The service worker skips the popup when the app
 * is already open and focused.)
 */
export async function notifyChatMembers(me: Profile, message: ChatMessage): Promise<void> {
  const admin = createAdminClient();
  const { data: chat } = await admin.from("chats").select("kind, user_a, user_b, cst_id").eq("id", message.chat_id).single();
  if (!chat) return;

  let recipients: string[] = [];
  let title = me.full_name;
  if (chat.kind === "direct") {
    recipients = [chat.user_a === me.id ? chat.user_b! : chat.user_a!];
  } else if (chat.cst_id) {
    const { data: cst } = await admin.from("class_subject_teachers").select("class_id, subject_id, teacher_id").eq("id", chat.cst_id).single();
    if (!cst) return;
    const [{ data: students }, { data: subject }] = await Promise.all([
      admin.from("students").select("id").eq("class_id", cst.class_id),
      admin.from("subjects").select("name").eq("id", cst.subject_id).single(),
    ]);
    recipients = [cst.teacher_id, ...(students ?? []).map((s) => s.id)];
    if (subject) title = `${me.full_name} · ${subject.name}`;
  }

  await sendPushToUsers(
    recipients.filter((id) => id !== me.id),
    { title, body: message.content.slice(0, 140), url: `/messages/${message.chat_id}`, tag: `chat-${message.chat_id}` }
  );
}

/**
 * Writes the safety log and alerts the admins. The alert never contains the
 * message itself (it may be explicit) — only who sent it; the text is on the
 * admin-only review page.
 */
export async function reportFlag({
  me,
  chatId,
  messageId,
  content,
  verdict,
}: {
  me: Profile;
  chatId: string;
  messageId: string | null;
  content: string;
  verdict: ModerationResult;
}): Promise<void> {
  const admin = createAdminClient();
  const blocked = verdict.action === "block";
  const concern = verdict.reasons.includes("self_harm");
  await admin.from("message_flags").insert({
    sender_id: me.id,
    chat_id: chatId,
    message_id: messageId,
    action: blocked ? "blocked" : "flagged",
    content,
    reasons: verdict.reasons,
    score: verdict.score,
  });

  // Only the sender's own school's admins: a prospect testing the filter on a
  // demo account must not alert the real AKIS admins (HANDOVER Part 45).
  const centerId = await getAppCenterId(me.id);
  const { data: grants } = await admin.from("profile_center_access").select("profile_id").eq("center_id", centerId ?? "");
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .is("archived_at", null)
    .in("id", (grants ?? []).map((g) => g.profile_id));
  await notifyUsers(
    (admins ?? []).map((a) => a.id).filter((id) => id !== me.id),
    {
      type: "safety",
      title: concern
        ? `Wellbeing concern: ${me.full_name}`
        : blocked
          ? `Blocked message from ${me.full_name}`
          : `Message from ${me.full_name} needs review`,
      body: concern
        ? "A message mentioned self-harm or suicide. It was delivered. Please check on them today."
        : blocked
          ? "The safety filter stopped a message. Review it in Message safety."
          : "A message was delivered but looked borderline. Please review it.",
      url: "/admin/message-safety",
    }
  );
}
