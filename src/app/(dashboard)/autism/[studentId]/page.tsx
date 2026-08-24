import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStudentAutismFeed } from "../queries";
import { UploadVideoForm } from "../UploadVideoForm";
import { MessageParentButton } from "../MessageParentButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AutismStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const me = await getCurrentProfile();
  if (!me) return null;
  const dict = await getDictionary(await getLocale());

  const { studentId } = await params;
  const feed = await getStudentAutismFeed(studentId, me);
  if (!feed || !feed.isTeacher) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy-900 dark:text-white">{feed.student.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.autismSection.videoHistory}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {feed.parents.map((p) => (
            <MessageParentButton key={p.id} parentId={p.id} parentName={p.full_name} />
          ))}
        </div>
      </FadeUp>

      {feed.parents.length === 0 && (
        <FadeUp delay={0.02}>
          <p className="text-xs text-slate-400 dark:text-navy-500">{dict.autismSection.noParentLinked}</p>
        </FadeUp>
      )}

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.autismSection.uploadVideo}</h2>
          <UploadVideoForm studentId={studentId} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-2">
        {feed.videos.length === 0 ? (
          <EmptyState title={dict.autismSection.noVideosYet} />
        ) : (
          feed.videos.map((v) => (
            <Link key={v.id} href={`/autism/video/${v.id}`}>
              <Card className="flex items-center justify-between gap-3 card-hover">
                <p className="truncate font-medium text-navy-900 dark:text-white">{v.title || dict.autismSection.latestVideo}</p>
                <span className="shrink-0 text-xs text-slate-400 dark:text-navy-500">{new Date(v.created_at).toLocaleDateString()}</span>
              </Card>
            </Link>
          ))
        )}
      </FadeUp>
    </div>
  );
}
