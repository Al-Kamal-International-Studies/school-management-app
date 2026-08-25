import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { listMyAutismStudents, getStudentAutismFeed } from "./queries";
import { listMyChildren } from "../parent/queries";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AutismSectionPage() {
  const me = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  if (!me) return null;

  // Shared by teacher and parent only (same "branch on role internally"
  // shape as /messages, /class-chat, /documents) — reserve /admin/autism
  // for the admin-exclusive assignment-management screen.
  if (me.role !== "teacher" && me.role !== "parent") {
    redirect(dashboardPathForRole(me.role));
  }

  if (me.role === "teacher") {
    const students = await listMyAutismStudents(me.id);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <FadeUp>
          <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
            {dict.autismSection.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.autismSection.subtitle}</p>
        </FadeUp>

        <FadeUp delay={0.05} className="space-y-2">
          {students.length === 0 ? (
            <EmptyState title={dict.autismSection.noAssignedStudents} description={dict.autismSection.noAssignedStudentsDescription} />
          ) : (
            students.map((s) => (
              <Link key={s.studentId} href={`/autism/${s.studentId}`}>
                <Card className="flex items-center justify-between gap-3 card-hover">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy-900 dark:text-white">{s.studentName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-navy-400">
                      {s.latestVideo ? `${dict.autismSection.latestVideo}: ${new Date(s.latestVideo.created_at).toLocaleDateString()}` : dict.autismSection.noVideosYet}
                    </p>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </FadeUp>
      </div>
    );
  }

  // parent: full video history for each linked child, right on this index
  // page (no separate nested route for parents — see this file's header
  // note and the approved plan's own reasoning for that choice).
  //
  // Filtered to is_autistic children only — a real bug fix (see
  // lib/autism/hasAutismAccess.ts): previously EVERY linked child appeared
  // here (with "no videos yet" for a non-autistic one), which is what the
  // nav-hiding fix alone wouldn't catch for a parent who reaches this route
  // directly. A parent with zero autistic children is redirected, same
  // pattern as the role check above — this route genuinely doesn't apply
  // to them, not just "nothing to show yet".
  const allChildren = await listMyChildren(me.id);
  const children = allChildren.filter((c) => c.is_autistic);
  if (children.length === 0) redirect(dashboardPathForRole(me.role));
  const feeds = (await Promise.all(children.map((c) => getStudentAutismFeed(c.id, me)))).filter((f): f is NonNullable<typeof f> => !!f);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
          {dict.autismSection.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.autismSection.subtitle}</p>
      </FadeUp>

      {feeds.length === 0 ? (
        <EmptyState title={dict.autismSection.noVideosYet} />
      ) : (
        feeds.map((feed) => (
          <FadeUp key={feed.student.id} delay={0.05} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{feed.student.full_name}</h2>
            {feed.videos.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500 dark:text-navy-400">{dict.autismSection.noVideosYet}</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {feed.videos.map((v) => (
                  <Link key={v.id} href={`/autism/video/${v.id}`}>
                    <Card className="flex items-center justify-between gap-3 card-hover">
                      <p className="truncate font-medium text-navy-900 dark:text-white">{v.title || dict.autismSection.latestVideo}</p>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-navy-500">{new Date(v.created_at).toLocaleDateString()}</span>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </FadeUp>
        ))
      )}
    </div>
  );
}
