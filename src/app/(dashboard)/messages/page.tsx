import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { listMyConversations, listContactablePeople } from "./queries";
import { NewConversationForm } from "./NewConversationForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { initials } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function MessagesPage() {
  const me = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  if (!me) return null;

  const [conversations, people] = await Promise.all([listMyConversations(me.id), listContactablePeople(me)]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.messages.title}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-navy-900 dark:text-white">{dict.messages.startWith}</h2>
          <NewConversationForm people={people} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-2">
        {conversations.length === 0 ? (
          <EmptyState title={dict.messages.noConversations} />
        ) : (
          conversations.map((c) => (
            <Link key={c.id} href={`/messages/${c.id}`}>
              <Card className="flex items-center gap-3 card-hover">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-gradient text-xs font-semibold text-white">
                  {c.other?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.other.avatar_url} alt={c.other.full_name} className="h-full w-full object-cover" />
                  ) : (
                    initials(c.other?.full_name ?? "?")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900 dark:text-white">{c.other?.full_name ?? dict.common.unknown}</p>
                </div>
                {c.other?.role && <Badge tone="slate">{c.other.role}</Badge>}
              </Card>
            </Link>
          ))
        )}
      </FadeUp>
    </div>
  );
}
