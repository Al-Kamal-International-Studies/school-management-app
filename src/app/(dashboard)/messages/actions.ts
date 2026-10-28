"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listInbox, PAGE_SIZE, toUiMessages } from "@/lib/chat/queries";
import type { InboxItem, UiMessage } from "@/lib/chat/types";

/**
 * Finds or creates the direct chat with `otherUserId` and returns its id.
 * open_direct_chat() (service role only) is the real gate: it returns null
 * unless can_start_chat() allows this pair (HANDOVER Part 42's rules).
 */
export async function openChatAction(otherUserId: string): Promise<{ chatId?: string; error?: string }> {
  const me = await requireSession();
  if (!z.guid().safeParse(otherUserId).success) return { error: "invalid" };
  const { data, error } = await createAdminClient().rpc("open_direct_chat", { p_me: me.id, p_other: otherUserId });
  if (error || !data) return { error: "not_allowed" };
  return { chatId: data };
}

/** Older history for the thread's "Load earlier messages" (RLS-scoped, filtered for display). */
export async function loadMessagesAction(chatId: string, opts: { before?: string; after?: string }): Promise<{ messages: UiMessage[]; hasMore: boolean }> {
  await requireSession();
  if (!z.guid().safeParse(chatId).success) return { messages: [], hasMore: false };
  const supabase = await createClient();
  let q = supabase.from("chat_messages").select("*").eq("chat_id", chatId);
  if (opts.before) q = q.lt("created_at", opts.before).order("created_at", { ascending: false }).limit(PAGE_SIZE);
  else if (opts.after) q = q.gt("created_at", opts.after).order("created_at", { ascending: true }).limit(500);
  const { data } = await q;
  const rows = opts.before ? [...(data ?? [])].reverse() : data ?? [];
  return { messages: toUiMessages(rows), hasMore: !!opts.before && rows.length === PAGE_SIZE };
}

/** Fresh inbox, e.g. when a message arrives in a chat this page hasn't seen yet. */
export async function refreshInboxAction(): Promise<InboxItem[]> {
  await requireSession();
  return listInbox();
}
