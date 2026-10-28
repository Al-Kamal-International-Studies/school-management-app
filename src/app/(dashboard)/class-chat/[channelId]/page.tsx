import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Old Class Chat links (notifications, bookmarks) pointed at a
 * class_subject_teachers id. Each one now has a subject group in Messages
 * (HANDOVER Part 42); send the user there.
 */
export default async function ClassChatChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  await requireSession();
  const { channelId } = await params;
  if (!z.guid().safeParse(channelId).success) redirect("/messages");
  const supabase = await createClient();
  const { data: chat } = await supabase.from("chats").select("id").eq("cst_id", channelId).maybeSingle();
  redirect(chat ? `/messages/${chat.id}` : "/messages");
}
