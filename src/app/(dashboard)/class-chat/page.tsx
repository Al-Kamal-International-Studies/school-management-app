import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { listMyChannels } from "./queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ClassChatPage() {
  const me = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  if (!me) return null;

  const channels = await listMyChannels(me);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.classChat.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.classChat.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.05} className="space-y-2">
        {channels.length === 0 ? (
          <EmptyState title={dict.classChat.noChannels} />
        ) : (
          channels.map((c) => (
            <Link key={c.id} href={`/class-chat/${c.id}`}>
              <Card className="flex items-center gap-3 card-hover">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-gradient text-xs font-semibold text-white">
                  {c.subjectName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900 dark:text-white">{c.subjectName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-navy-400">
                    {c.className}
                    {me.role === "student" ? ` · ${c.teacherName}` : ""}
                  </p>
                </div>
                {me.role === "student" && <Badge tone="slate">{c.className}</Badge>}
              </Card>
            </Link>
          ))
        )}
      </FadeUp>
    </div>
  );
}
