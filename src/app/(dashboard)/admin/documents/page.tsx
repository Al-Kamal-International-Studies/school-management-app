import { requireRole } from "@/lib/auth";
import { listAllDocuments, listStudentsForSelect } from "./queries";
import { UploadForm } from "./UploadForm";
import { DeleteDocumentButton } from "./DeleteDocumentButton";
import { DownloadButton } from "@/components/documents/DownloadButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export default async function AdminDocumentsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  // requireRole("admin") above guarantees a profile, so this is never
  // actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const [documents, students] = await Promise.all([listAllDocuments(activeCenterId), listStudentsForSelect(activeCenterId)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.documents.title}</h1>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.documents.upload}</h2>
          <UploadForm students={students} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15} className="space-y-3">
        {documents.length === 0 ? (
          <EmptyState title={dict.documents.noDocuments} />
        ) : (
          documents.map((d) => (
            <Card key={d.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{d.title}</p>
                  <Badge tone="navy">{d.category}</Badge>
                  {d.studentName && <Badge tone="gold">{d.studentName}</Badge>}
                </div>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-navy-500">{new Date(d.created_at).toLocaleDateString()}</p>
                <div className="mt-2">
                  <DownloadButton documentId={d.id} />
                </div>
              </div>
              <DeleteDocumentButton id={d.id} filePath={d.file_path} />
            </Card>
          ))
        )}
      </FadeUp>
    </div>
  );
}
