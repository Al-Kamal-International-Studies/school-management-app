import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "./EventForm";
import { DeleteEventButton } from "./DeleteEventButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { EventType } from "@/lib/types/database.types";

const TYPE_TONE: Record<EventType, "navy" | "gold" | "red"> = { event: "navy", holiday: "gold", deadline: "red" };

export default async function AdminEventsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*").order("event_date", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.calendar.title}</h1>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.calendar.newEvent}</h2>
          <EventForm />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15} className="space-y-3">
        {!events || events.length === 0 ? (
          <EmptyState title={dict.calendar.noEvents} />
        ) : (
          events.map((e) => (
            <Card key={e.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{e.title}</p>
                  <Badge tone={TYPE_TONE[e.event_type]}>{e.event_type}</Badge>
                </div>
                {e.description && <p className="mt-1 text-sm text-slate-600 dark:text-navy-200">{e.description}</p>}
                <p className="mt-1.5 text-xs text-slate-400 dark:text-navy-500">{e.event_date}</p>
              </div>
              <DeleteEventButton id={e.id} />
            </Card>
          ))
        )}
      </FadeUp>
    </div>
  );
}
