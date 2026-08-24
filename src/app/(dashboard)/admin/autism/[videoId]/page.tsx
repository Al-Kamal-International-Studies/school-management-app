import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminAutismVideoDetail } from "../queries";
import { getAutismVideoUrlAction } from "@/lib/autism/getVideoUrl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/**
 * Admin's read-only video + thread — no comment box is ever rendered here
 * (not conditionally hidden, genuinely never built), matching the
 * view-only product decision enforced server-side by
 * can_comment_on_autism_video() (0033_autism_section.sql).
 */
export default async function AdminAutismVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());

  const { videoId } = await params;
  const detail = await getAdminAutismVideoDetail(videoId);
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
          <div className="space-y-3">
            {detail.comments.length === 0 && <p className="text-center text-sm text-slate-400 dark:text-navy-500">{dict.autismSection.noComments}</p>}
            {detail.comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-navy-800 dark:text-navy-100">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-navy-400">{c.author?.full_name ?? dict.common.unknown}</span>
                  {c.author?.role === "teacher" && <Badge tone="gold">{dict.classChat.teacherBadge}</Badge>}
                </div>
                <span className="whitespace-pre-wrap">{c.content}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400 dark:text-navy-500">{dict.autismSection.adminViewOnly}</p>
        </Card>
      </FadeUp>
    </div>
  );
}
