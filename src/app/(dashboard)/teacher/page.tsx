import Link from "next/link";
import { ClipboardList, Megaphone, School, Users, CalendarDays, ClipboardCheck } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listMyClasses, getMySchedule, getOverviewStats } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { formatTime, jsDayToDbDay } from "@/lib/utils";
import { WelcomeRobot } from "@/components/dashboard/WelcomeRobot";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

// Shared focus/hover treatment for dashboard rows that are now real links —
// see the identical constant + comment in admin/page.tsx.
const ROW_LINK_CLASS =
  "group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-gold-400 dark:focus-visible:ring-offset-navy-950";
const ROW_CARD_CLASS = "card-hover transition-colors hover:border-navy-200 dark:hover:border-navy-600";

export default async function TeacherDashboardPage() {
  const profile = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  const [classes, schedule, announcements, stats] = await Promise.all([
    listMyClasses(profile!.id),
    getMySchedule(profile!.id),
    listVisibleAnnouncements(3),
    getOverviewStats(profile!.id),
  ]);

  const todayDbDay = jsDayToDbDay(new Date().getDay());
  const todaysClasses = schedule.filter((e) => e.day_of_week === todayDbDay);

  // `classes` has one row per (class, subject) assignment, so the same
  // class can repeat — dedupe by class id for an accurate "classes taught"
  // and "students taught" count.
  const distinctClasses = new Map<string, number>();
  for (const c of classes) {
    if (c.class) distinctClasses.set(c.class.id, c.studentCount);
  }
  const totalStudents = [...distinctClasses.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-10">
      <FadeUp className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <WelcomeRobot name={profile!.full_name} role="teacher" dict={dict} dataTour="page-title" />
          <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.common.todaysScheduleAndClasses}</p>
        </div>
        <Link href="/teacher/progress" className="shrink-0">
          <Button>
            <ClipboardList className="h-4 w-4" />
            {dict.teacherDashboard.submitProgress}
          </Button>
        </Link>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.06}>
        <FadeUpItem>
          <StatCard label={dict.nav.myClasses} value={distinctClasses.size} icon={School} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.adminClasses.students} value={totalStudents} icon={Users} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.teacherDashboard.upcomingExams} value={stats.upcomingExamCount} icon={CalendarDays} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard
            label={dict.teacherDashboard.pendingGrading}
            value={stats.pendingGradingCount}
            hint={stats.pendingGradingCount === 0 ? dict.teacherDashboard.allGraded : undefined}
            icon={ClipboardCheck}
          />
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.1} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.common.todaysSchedule}</h2>
        {todaysClasses.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.common.noClassesToday}</p>
          </Card>
        ) : (
          <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.06}>
            {todaysClasses.map((e) => (
              <FadeUpItem key={e.id}>
                {/* Teachers have no per-class detail page, so this links to
                    the one page where "this class, right now" is actually
                    actionable: marking today's attendance for it. */}
                <Link href={`/teacher/attendance?class=${e.class_id}`} className={ROW_LINK_CLASS}>
                  <Card className={ROW_CARD_CLASS}>
                    <p className="text-xs font-medium text-slate-500 dark:text-navy-400">
                      {formatTime(e.start_time)} – {formatTime(e.end_time)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{e.subjectName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.className}</p>
                    {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{dict.exams.room} {e.room}</p>}
                  </Card>
                </Link>
              </FadeUpItem>
            ))}
          </FadeUpStagger>
        )}
      </FadeUp>

      <FadeUp delay={0.14} className="space-y-4">
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.16} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.nav.myClasses}</h2>
        {classes.length === 0 ? (
          <EmptyState
            title={dict.teacherDashboard.noClassesAssignedYet}
            description={dict.teacherDashboard.noClassesAssignedDescription}
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.adminClasses.class}</Th>
                <Th>{dict.adminClasses.subject}</Th>
                <Th>{dict.adminClasses.students}</Th>
              </tr>
            </Thead>
            <Tbody>
              {classes.map((c) => (
                // "Stretched link" pattern: the anchor's ::before covers the
                // whole row (via `relative` on <tr>, `absolute inset-0` on
                // the pseudo), so the entire row is a click target — not
                // just the class-name cell — while still being valid table
                // markup (an <a> can't be a <tr> itself). No dedicated
                // per-class page exists for teachers, so this goes to the
                // closest real action for that class: marking attendance.
                <tr key={c.id} className={c.class ? "relative" : undefined}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    {c.class ? (
                      <Link
                        href={`/teacher/attendance?class=${c.class.id}`}
                        className="outline-none before:absolute before:inset-0 before:rounded-none before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-navy-400 dark:focus-visible:before:ring-gold-400"
                      >
                        {`${c.class.name} - ${c.class.section}`}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{c.subjectName}</Td>
                  <Td>{c.studentCount}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
