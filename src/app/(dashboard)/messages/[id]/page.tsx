import { notFound } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getChatDetail } from "@/lib/chat/queries";
import { ChatThread } from "@/components/chat/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSession();
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();

  const detail = await getChatDetail(id, me);
  if (!detail) notFound();

  // keyed by chat so switching chats starts a fresh thread state
  return <ChatThread key={detail.id} myId={me.id} detail={detail} />;
}
