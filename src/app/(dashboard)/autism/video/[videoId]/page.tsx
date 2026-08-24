import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getAutismVideoDetail } from "../../queries";
import { getAutismVideoUrlAction } from "@/lib/autism/getVideoUrl";
import { CommentThread } from "./CommentThread";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AutismVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const me = await getCurrentProfile();
  if (!me) return null;
  const dict = await getDictionary(await getLocale());

  const { videoId } = await params;
  const detail = await getAutismVideoDetail(videoId, me);
  if (!detail) notFound();

  const { url } = await getAutismVideoUrlAction(videoId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FadeUp>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-navy-900 dark:text-white">{detail.video.title || dict.autismSection.latestVideo}</h1>
          <Badge tone="slate">{detail.student?.full_name ?? dict.common.unknown}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
          {dict.autismSection.uploadedBy.replace("{name}", detail.uploader?.full_name ?? dict.common.unknown)} ·{" "}
          {new Date(detail.video.created_at).toLocaleString()}
        </p>
      </FadeUp>

      <FadeUp delay={0.04}>
        <Card>
          {url ? (
            <video src={url} controls className="w-full rounded-lg bg-black" />
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">{dict.common.unknown}</p>
          )}
        </Card>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-navy-900 dark:text-white">{dict.autismSection.comments}</h2>
          <CommentThread videoId={videoId} myId={me.id} canComment={detail.canComment} comments={detail.comments} />
        </Card>
      </FadeUp>
    </div>
  );
}
