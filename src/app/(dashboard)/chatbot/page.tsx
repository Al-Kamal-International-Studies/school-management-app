import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listMyConversations } from "./queries";
import { startConversationAction } from "./actions";
import { PERSONA_LIST, PERSONAS, getGreeting } from "@/lib/chatbot/personas";
import type { ChatRole } from "@/lib/chatbot/faq";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ChatbotHomePage() {
  const me = await getCurrentProfile();
  const [conversations, locale] = await Promise.all([listMyConversations(me!.id), getLocale()]);
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.chatbot.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.chatbot.subtitle}</p>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PERSONA_LIST.map((persona) => (
          <FadeUpItem key={persona.id}>
            <Card className="card-hover flex h-full flex-col items-center text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={persona.avatarSrc} alt={persona.name} className="h-full w-full object-cover" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-navy-900 dark:text-white">{persona.name}</h2>
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.chatbot.personaRole}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-navy-400">
                {getGreeting(persona.id, me!.role as ChatRole, locale)}
              </p>
              <form action={startConversationAction} className="mt-5 w-full">
                <input type="hidden" name="persona" value={persona.id} />
                <Button type="submit" className="w-full">
                  {dict.chatbot.chatWithPrefix} {persona.name}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </form>
            </Card>
          </FadeUpItem>
        ))}
      </FadeUpStagger>

      {conversations.length > 0 && (
        <FadeUp delay={0.15} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.chatbot.recentConversations}</h2>
          <div className="space-y-2">
            {conversations.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/chatbot/${c.id}`}
                className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="text-sm text-slate-700 dark:text-navy-100">
                  {dict.chatbot.chatWithPrefix} <span className="font-medium">{PERSONAS[c.persona].name}</span>
                </span>
                <span className="ms-auto text-xs text-slate-400 dark:text-navy-500">
                  {new Date(c.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        </FadeUp>
      )}
    </div>
  );
}
