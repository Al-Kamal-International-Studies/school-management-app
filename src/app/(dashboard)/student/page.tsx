import { MessageSquareText, Megaphone, CalendarClock, ClipboardCheck, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getMyClassInfo, getMySchedule, listMyProgressEntries, summarizeByMonth, listMyRemarks, listMyBehaviourEntries } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatTime, jsDayToDbDay } from "@/lib/utils";
import { formatMonth } from "@/lib/progress/calculate";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function StudentDashboardPage() {
  const profile = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  const { student, classRow } = await getMyClassInfo(profile!.id);
  const [schedule, progressEntries, announcements, remarks, behaviourEntries] = await Promise.all([
    getMySchedule(student?.class_id ?? null),
    listMyProgressEntries(profile!.id),
    listVisibleAnnouncements(5),
    listMyRemarks(profile!.id),
    listMyBehaviourEntries(profile!.id),
  ]);

  const todayDbDay = jsDayToDbDay(new Date().getDay());
  const todaysClasses = schedule.filter((e) => e.day_of_week === todayDbDay);

  const monthly = summarizeByMonth(progressEntries);
  const latest = monthly[0];
  const maxScore = Math.max(100, ...monthly.map((m) => m.averageScore));
  const recentComments = progressEntries.filter((e) => e.teacher_comments).slice(0, 4);

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.common.welcome}, {profile!.full_name}</h1>
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
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.academicProgress}</h2>
            {latest ? (
              <div className="flex items-center gap-5">
                <ProgressRing value={latest.averageScore} label={dict.progress.overallScore} />
                <p className="text-xs text-slate-500 dark:text-navy-400">{formatMonth(latest.month)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
            )}
          </Card>
        </FadeUpItem>

        <FadeUpItem>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.attendanceSummary}</h2>
            {latest ? (
              <div>
                <p className="font-display text-3xl font-semibold text-navy-900 dark:text-white">
                  {latest.averageAttendance.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-navy-400">{formatMonth(latest.month)}</p>
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

      <FadeUp delay={0.2} className="space-y-4">
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
        <FadeUp delay={0.22} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <FadeUp delay={0.24} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.upcomingTasks}</h2>
        <Card>
          <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.upcomingTasksNotAvailable}</p>
        </Card>
      </FadeUp>

      <FadeUp delay={0.28} className="space-y-4">
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
                <Card>
                  <p className="text-xs font-medium text-slate-500 dark:text-navy-400">
                    {formatTime(e.start_time)} – {formatTime(e.end_time)}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{e.subjectName}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.teacherName}</p>
                  {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{dict.exams.room} {e.room}</p>}
                </Card>
              </FadeUpItem>
            ))}
          </FadeUpStagger>
        )}
      </FadeUp>
    </div>
  );
}
