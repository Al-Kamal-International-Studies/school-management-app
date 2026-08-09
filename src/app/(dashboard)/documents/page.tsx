import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DownloadButton } from "@/components/documents/DownloadButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function DocumentsPage() {
  await requireRole("teacher", "student", "parent");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();

  // RLS scopes this to documents matching audience/role, or specifically
  // linked to the caller if they're the student in question.
  const { data: documents } = await supabase.from("documents").select("*").order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.documents.title}</h1>
      </FadeUp>
      <FadeUp delay={0.05} className="space-y-3">
        {!documents || documents.length === 0 ? (
          <EmptyState title={dict.documents.noDocuments} />
        ) : (
          documents.map((d) => (
            <Card key={d.id} className="flex items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{d.title}</p>
                  <Badge tone="navy">{d.category}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <DownloadButton documentId={d.id} />
            </Card>
          ))
        )}
      </FadeUp>
    </div>
  );
}
