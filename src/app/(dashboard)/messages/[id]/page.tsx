import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getConversation } from "../queries";
import { MessageThread } from "./MessageThread";
import { Card } from "@/components/ui/Card";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSession();
  if (!me) return null;
  const dict = await getDictionary(await getLocale());

  const { id } = await params;
  const detail = await getConversation(id, me.id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FadeUp>
        <h1 className="page-title-compact">{detail.other?.full_name ?? dict.common.unknown}</h1>
      </FadeUp>
      <FadeUp delay={0.05}>
        <Card>
          <MessageThread conversationId={id} myId={me.id} messages={detail.messages} />
        </Card>
      </FadeUp>
    </div>
  );
}
