import Link from "next/link";
import { MessageSquareText, Megaphone, CalendarClock, ClipboardCheck, Sparkles, Award } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import {
  getMyClassInfo,
  getMySchedule,
  listMyProgressEntries,
  listMyRemarks,
  listMyBehaviourEntries,
  listMyRecentGrades,
  listUpcomingItems,
} from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sparkline, TrendDelta } from "@/components/ui/Sparkline";
import { formatTime, jsDayToDbDay, cn } from "@/lib/utils";
import { formatMonth, summarizeByMonth } from "@/lib/progress/calculate";
import { WelcomeRobot } from "@/components/dashboard/WelcomeRobot";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

const UPCOMING_KIND_TONE = { assignment: "navy", exam: "navy", quiz: "gold" } as const;
// Where each upcoming-item kind's own list page lives — assignments and
// exams/quizzes are separate pages for a student, so the destination
// differs per row rather than being one fixed href.
const UPCOMING_KIND_HREF = { assignment: "/student/assignments", exam: "/student/exams", quiz: "/student/exams" } as const;

// Shared focus/hover treatment for dashboard rows that are now real links —
// see the identical constant + comment in admin/page.tsx.
const ROW_LINK_CLASS =
  "group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-gold-400 dark:focus-visible:ring-offset-navy-950";
const ROW_CARD_CLASS = "card-hover transition-colors hover:border-navy-200 dark:hover:border-navy-600";

export default async function StudentDashboardPage() {
  const profile = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  const { student, classRow } = await getMyClassInfo(profile!.id);
  const [schedule, progressEntries, announcements, remarks, behaviourEntries, recentGrades, upcomingItems] = await Promise.all([
    getMySchedule(student?.class_id ?? null),
    listMyProgressEntries(profile!.id),
    listVisibleAnnouncements(5),
    listMyRemarks(profile!.id),
    listMyBehaviourEntries(profile!.id),
    listMyRecentGrades(profile!.id),
    listUpcomingItems(student?.class_id ?? null),
  ]);

  const todayDbDay = jsDayToDbDay(new Date().getDay());
  const todaysClasses = schedule.filter((e) => e.day_of_week === todayDbDay);

  const monthly = summarizeByMonth(progressEntries);
  const latest = monthly[0];
  const maxScore = Math.max(100, ...monthly.map((m) => m.averageScore));
  const recentComments = progressEntries.filter((e) => e.teacher_comments).slice(0, 4);

  // Chronological (oldest first) for the sparklines; the delta compares the
  // latest month to the one before it.
  const scoreTrend = monthly.slice(0, 6).map((m) => m.averageScore).reverse();
  const attendanceTrend = monthly.slice(0, 6).map((m) => m.averageAttendance).reverse();
  const scoreDelta = monthly.length > 1 ? monthly[0]!.averageScore - monthly[1]!.averageScore : null;
  const attendanceDelta = monthly.length > 1 ? monthly[0]!.averageAttendance - monthly[1]!.averageAttendance : null;

  return (
    <div className="space-y-10">
      <FadeUp>
        <WelcomeRobot name={profile!.full_name} role="student" dict={dict} dataTour="page-title" />
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">
          {classRow ? `${classRow.name} - ${classRow.section}` : dict.studentDashboard.noClassAssignedShort} · {dict.studentDashboard.enrollmentHash}
          {student?.enrollment_number}
        </p>
      </FadeUp>

      {!classRow && (
        <FadeUp delay={0.06}>
          <Alert tone="info">{dict.myTimetable.noClassAssigned}</Alert>
        </FadeUp>
      )}

      <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" staggerDelay={0.06}>
        <FadeUpItem>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.academicProgress}</h2>
              {monthly.length > 1 && <TrendDelta value={scoreDelta} goodDirection="up" />}
            </div>
            {latest ? (
              <div className="flex items-center gap-5">
                <ProgressRing value={latest.averageScore} label={dict.progress.overallScore} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-navy-400">{formatMonth(latest.month)}</p>
                  {scoreTrend.length > 1 && (
                    <div className="mt-3">
                      <Sparkline points={scoreTrend} height={28} />
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-navy-500">{dict.progress.vsLastMonth}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
            )}
          </Card>
        </FadeUpItem>

        <FadeUpItem>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.attendanceSummary}</h2>
              {monthly.length > 1 && <TrendDelta value={attendanceDelta} goodDirection="up" />}
            </div>
            {latest ? (
              <div>
                <p className="font-display text-3xl font-semibold text-navy-900 dark:text-white">
                  {latest.averageAttendance.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-navy-400">{formatMonth(latest.month)}</p>
                {attendanceTrend.length > 1 && (
                  <div className="mt-3">
                    <Sparkline points={attendanceTrend} height={28} />
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-navy-500">{dict.progress.vsLastMonth}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
            )}
          </Card>
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.12} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.monthlyOverview}</h2>
        {monthly.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYet}</p>
          </Card>
        ) : (
          <Card>
            <div className="space-y-3">
              {monthly.slice(0, 6).map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500 dark:text-navy-400">{formatMonth(m.month)}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
                    <div
                      className="h-full rounded-full bg-gold-gradient"
                      style={{ width: `${Math.min(100, (m.averageScore / maxScore) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold text-navy-900 dark:text-white">
                    {m.averageScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </FadeUp>

      <FadeUp delay={0.16} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.recentComments}</h2>
        {recentComments.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentComments.map((e) => (
              <Card key={e.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-navy-400">
                    {e.subjectName} · {formatMonth(e.month)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-navy-100">{e.teacher_comments}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.19} className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
          <Award className="h-4 w-4" />
          {dict.grades.recentGrades}
        </h2>
        {recentGrades.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.grades.noGrades}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentGrades.map((g) => (
              // No per-grade detail page exists — links to the full grades
              // list, the closest real destination for "this grade".
              <Link key={g.id} href="/student/grades" className={ROW_LINK_CLASS}>
                <Card className={cn("flex items-center justify-between gap-4", ROW_CARD_CLASS)}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900 dark:text-white">{g.assessment_name}</p>
                    <p className="text-xs text-slate-500 dark:text-navy-400">{g.subjectName}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-navy-900 dark:text-white">
                    {g.marks_obtained}/{g.marks_total}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.22} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.announcements.title}</h2>
        {announcements.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.announcements.noAnnouncements}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-900 dark:text-white">{a.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-navy-200">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>

      {(remarks.length > 0 || behaviourEntries.length > 0) && (
        <FadeUp delay={0.25} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
              <ClipboardCheck className="h-4 w-4" />
              {dict.remarks.title}
            </h2>
            {remarks.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500 dark:text-navy-400">{dict.remarks.noRemarks}</p>
              </Card>
            ) : (
              remarks.map((r) => (
                <Card key={r.id} className="text-sm">
                  <p className="text-slate-600 dark:text-navy-200">{r.remark}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(r.created_at).toLocaleDateString()}</p>
                </Card>
              ))
            )}
          </div>
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
              <Sparkles className="h-4 w-4" />
              {dict.behaviour.title}
            </h2>
            {behaviourEntries.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500 dark:text-navy-400">{dict.behaviour.noEntries}</p>
              </Card>
            ) : (
              behaviourEntries.map((b) => (
                <Card key={b.id} className="text-sm">
                  <Badge tone={b.category === "positive" ? "green" : "red"}>{b.category}</Badge>
                  <p className="mt-1.5 text-slate-600 dark:text-navy-200">{b.description}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(b.created_at).toLocaleDateString()}</p>
                </Card>
              ))
            )}
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.28} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.upcomingTasks}</h2>
        {upcomingItems.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noUpcomingItems}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingItems.map((item) => (
              // Assignments and exams/quizzes are two separate list pages
              // for a student — no shared per-item detail page — so each
              // row links to whichever list actually contains it.
              <Link key={`${item.kind}-${item.id}`} href={UPCOMING_KIND_HREF[item.kind]} className={ROW_LINK_CLASS}>
                <Card className={cn("flex items-center justify-between gap-4", ROW_CARD_CLASS)}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-navy-900 dark:text-white">{item.title}</p>
                      <Badge tone={UPCOMING_KIND_TONE[item.kind]}>
                        {item.kind === "assignment" ? dict.assignments.assignment : item.kind === "quiz" ? dict.exams.quiz : dict.exams.exam}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{item.subjectName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-navy-500">{item.date}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.32} className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
          <CalendarClock className="h-4 w-4" />
          {dict.common.todaysSchedule}
        </h2>
        {todaysClasses.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.common.noClassesToday}</p>
          </Card>
        ) : (
          <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.06}>
            {todaysClasses.map((e) => (
              <FadeUpItem key={e.id}>
                {/* No per-timeslot detail page exists — links to the full
                    weekly timetable, the closest real destination. */}
                <Link href="/student/timetable" className={ROW_LINK_CLASS}>
                  <Card className={ROW_CARD_CLASS}>
                    <p className="text-xs font-medium text-slate-500 dark:text-navy-400">
                      {formatTime(e.start_time)} – {formatTime(e.end_time)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{e.subjectName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.teacherName}</p>
                    {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{dict.exams.room} {e.room}</p>}
                  </Card>
                </Link>
              </FadeUpItem>
            ))}
          </FadeUpStagger>
        )}
      </FadeUp>
    </div>
  );
}
