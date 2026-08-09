import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { EventType } from "@/lib/types/database.types";

const TYPE_TONE: Record<EventType, "navy" | "gold" | "red"> = { event: "navy", holiday: "gold", deadline: "red" };

export default async function CalendarPage() {
  await requireRole("admin", "teacher", "student", "parent");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();

  // RLS scopes this to events matching the caller's role (or 'all'), same
  // pattern as listVisibleAnnouncements.
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.calendar.title}</h1>
      </FadeUp>
      <FadeUp delay={0.05} className="space-y-3">
        {!events || events.length === 0 ? (
          <EmptyState title={dict.calendar.noEvents} />
        ) : (
          events.map((e) => (
            <Card key={e.id} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-50 text-navy-900 dark:bg-navy-800 dark:text-white">
                <span className="text-lg font-bold leading-none">{new Date(`${e.event_date}T00:00:00`).getDate()}</span>
                <span className="text-[10px] uppercase text-slate-500 dark:text-navy-400">
                  {new Date(`${e.event_date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{e.title}</p>
                  <Badge tone={TYPE_TONE[e.event_type]}>{e.event_type}</Badge>
                </div>
                {e.description && <p className="mt-1 text-sm text-slate-600 dark:text-navy-200">{e.description}</p>}
              </div>
            </Card>
          ))
        )}
      </FadeUp>
    </div>
  );
}
