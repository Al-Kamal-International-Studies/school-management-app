import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getChannel } from "../queries";
import { ChannelThread } from "./ChannelThread";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ClassChatChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const me = await getCurrentProfile();
  if (!me) return null;
  const dict = await getDictionary(await getLocale());

  const { channelId } = await params;
  const detail = await getChannel(channelId, me);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FadeUp>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-navy-900 dark:text-white">{detail.subjectName}</h1>
          <Badge tone="slate">{detail.className}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.classChat.taughtBy.replace("{teacher}", detail.teacherName)}</p>
      </FadeUp>
      <FadeUp delay={0.05}>
        <Card>
          <ChannelThread channelId={channelId} myId={me.id} isTeacher={detail.isTeacher} messages={detail.messages} />
        </Card>
      </FadeUp>
    </div>
  );
}
