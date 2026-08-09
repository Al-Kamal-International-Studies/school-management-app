import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getConversation, getMessages, countUserMessages } from "../queries";
import { ChatInterface } from "./ChatInterface";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function ChatbotConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  const conversation = await getConversation(id, me!.id);
  if (!conversation) notFound();

  const [messages, userMessageCount] = await Promise.all([getMessages(conversation.id), countUserMessages(conversation.id)]);

  return (
    <FadeUp className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <ChatInterface conversation={conversation} initialMessages={messages} initialUserMessageCount={userMessageCount} />
    </FadeUp>
  );
}
