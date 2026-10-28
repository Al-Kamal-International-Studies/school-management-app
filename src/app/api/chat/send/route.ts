import "server-only";

import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateMessage } from "@/lib/moderation";
import { notifyChatMembers, reportFlag } from "@/lib/chat/after-send";

const bodySchema = z.object({
  chatId: z.guid(),
  clientId: z.guid(),
  content: z.string().trim().min(1).max(4000),
});

/**
 * Sends one chat message (HANDOVER Part 42). A Route Handler rather than a
 * Server Action on purpose: React runs Server Actions one at a time per page,
 * so a burst of messages queued behind each other; plain fetches go out in
 * parallel and carry no RSC payload.
 *
 * Hot path = session check, the in-process safety filter (<1 ms), and ONE
 * database round trip (send_chat_message() checks membership/permission, rate
 * limits, dedupes by clientId and inserts). Push notifications and the safety
 * log run in after(), once the response is already on its way. Delivery to
 * the other side is Supabase Realtime, not this request.
 */
export async function POST(req: NextRequest) {
  const me = await requireSession();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { chatId, clientId, content } = parsed.data;

  const verdict = moderateMessage(content);
  if (verdict.action === "block") {
    after(() => reportFlag({ me, chatId, messageId: null, content, verdict }));
    return Response.json({ error: "blocked" }, { status: 422 });
  }

  const { data: message, error } = await createAdminClient().rpc("send_chat_message", {
    p_sender: me.id,
    p_chat_id: chatId,
    p_content: content,
    p_client_id: clientId,
  });
  if (error || !message) {
    const code = error?.message.includes("rate_limited") ? "rate_limited" : error?.message.includes("not_allowed") ? "not_allowed" : "failed";
    return Response.json({ error: code }, { status: code === "failed" ? 500 : code === "rate_limited" ? 429 : 403 });
  }

  after(async () => {
    await notifyChatMembers(me, message);
    if (verdict.action === "flag") await reportFlag({ me, chatId, messageId: message.id, content, verdict });
  });

  return Response.json({ message });
}
