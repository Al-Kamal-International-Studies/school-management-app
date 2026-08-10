import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "./AnnouncementForm";
import { DeleteAnnouncementButton } from "./DeleteAnnouncementButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { AnnouncementAudience } from "@/lib/types/database.types";

const AUDIENCE_TONE: Record<AnnouncementAudience, "navy" | "green" | "gold" | "slate"> = {
  all: "navy",
  teacher: "green",
  student: "gold",
  parent: "slate",
};

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: announcements } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.announcements.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">
          {dict.announcements.subtitle}
        </p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.announcements.newAnnouncement}</h2>
          <AnnouncementForm />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15} className="space-y-3">
        {!announcements || announcements.length === 0 ? (
          <EmptyState title={dict.announcements.noAnnouncements} />
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{a.title}</p>
                  <Badge tone={AUDIENCE_TONE[a.audience]}>{a.audience}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-navy-200">{a.body}</p>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-navy-500">
                  {dict.announcements.posted} {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <DeleteAnnouncementButton id={a.id} />
            </Card>
          ))
        )}
      </FadeUp>
    </div>
  );
}
