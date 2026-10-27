import Link from "next/link";
import { ClipboardList, School, Users, CalendarDays, ClipboardCheck, ChevronRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listMyClasses, getMySchedule, getOverviewStats } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { formatTime } from "@/lib/utils";
import { schoolWeekdayDb, formatSchoolDate } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { CacheDashboardForOffline } from "@/components/offline/CacheDashboardForOffline";

export default async function TeacherDashboardPage() {
  const profile = await getCurrentProfile();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [classes, schedule, announcements, stats] = await Promise.all([
    listMyClasses(profile!.id),
    getMySchedule(profile!.id),
    listVisibleAnnouncements(3),
    getOverviewStats(profile!.id),
  ]);

  const todayDbDay = schoolWeekdayDb();
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
    <div className="space-y-7">
      {/* Real offline behavior for Apple's Guideline 4.2 review — see the
          identical setup + comment in (dashboard)/parent/page.tsx. Teachers
          have no single "overall score"/"attendance rate" of their own
          (those concepts are per-student), so both are left null — the
          offline card in app/offline/page.tsx already hides those tiles
          when null. */}
      <CacheDashboardForOffline
        userId={profile!.id}
        role="teacher"
        summary={{
          displayName: profile!.full_name,
          subtitle: `${distinctClasses.size} ${dict.nav.myClasses} · ${totalStudents} ${dict.adminClasses.students}`,
          overallScore: null,
          attendanceRate: null,
          announcements: announcements.map((a) => ({ title: a.title, date: new Date(a.created_at).toLocaleDateString() })),
        }}
      />
      <PageHeader
        eyebrow={formatSchoolDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        title={`${dict.common.welcome}, ${profile!.full_name}`}
        titleDataTour="page-title"
        description={dict.common.todaysScheduleAndClasses}
        action={
          <Link href="/teacher/progress" className="btn-primary">
            <ClipboardList className="h-4 w-4" />
            {dict.teacherDashboard.submitProgress}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={dict.nav.myClasses} value={distinctClasses.size} icon={School} />
        <StatCard label={dict.adminClasses.students} value={totalStudents} icon={Users} />
        <StatCard label={dict.teacherDashboard.upcomingExams} value={stats.upcomingExamCount} icon={CalendarDays} />
        <StatCard
          label={dict.teacherDashboard.pendingGrading}
          value={stats.pendingGradingCount}
          hint={stats.pendingGradingCount === 0 ? dict.teacherDashboard.allGraded : undefined}
          icon={ClipboardCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2" aria-labelledby="todays-schedule">
          <h2 id="todays-schedule" className="section-title">{dict.common.todaysSchedule}</h2>
          <div className="card overflow-hidden">
            {todaysClasses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 dark:text-navy-400">{dict.common.noClassesToday}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-navy-800">
                {todaysClasses.map((e) => (
                  <li key={e.id}>
                    {/* Teachers have no per-class detail page, so each row
                        links to the one page where "this class, right now"
                        is actually actionable: marking today's attendance. */}
                    <Link
                      href={`/teacher/attendance?class=${e.class_id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]"
                    >
                      <span className="tabular w-[8.75rem] shrink-0 whitespace-nowrap text-sm text-slate-500 dark:text-navy-400">
                        <bdi dir="ltr">{formatTime(e.start_time)} – {formatTime(e.end_time)}</bdi>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{e.subjectName}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-navy-400">{e.className}</span>
                      </span>
                      {e.room && (
                        <span className="shrink-0 text-xs text-slate-500 dark:text-navy-400">
                          {dict.exams.room} <bdi>{e.room}</bdi>
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180 dark:text-navy-600" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="teacher-announcements">
          <h2 id="teacher-announcements" className="section-title">{dict.announcements.title}</h2>
          <div className="card overflow-hidden">
            {announcements.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 dark:text-navy-400">{dict.announcements.noAnnouncements}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-navy-800">
                {announcements.map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-navy-300">{a.body}</p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-navy-500">
                      <time dateTime={a.created_at}>{formatSchoolDate(a.created_at, locale)}</time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-3" aria-labelledby="teacher-classes">
        <h2 id="teacher-classes" className="section-title">{dict.nav.myClasses}</h2>
        {classes.length === 0 ? (
          <div className="card">
            <EmptyState
              title={dict.teacherDashboard.noClassesAssignedYet}
              description={dict.teacherDashboard.noClassesAssignedDescription}
            />
          </div>
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
                        className="outline-none before:absolute before:inset-0 before:rounded-none before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-navy-400 dark:focus-visible:before:ring-navy-300"
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
      </section>
    </div>
  );
}
