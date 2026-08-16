import Link from "next/link";
import { ClipboardList, Megaphone } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listMyClasses, getMySchedule } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { formatTime, jsDayToDbDay } from "@/lib/utils";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherDashboardPage() {
  const profile = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  const [classes, schedule, announcements] = await Promise.all([
    listMyClasses(profile!.id),
    getMySchedule(profile!.id),
    listVisibleAnnouncements(3),
  ]);

  const todayDbDay = jsDayToDbDay(new Date().getDay());
  const todaysClasses = schedule.filter((e) => e.day_of_week === todayDbDay);

  return (
    <div className="space-y-10">
      <FadeUp className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.common.welcome}, {profile!.full_name}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.common.todaysScheduleAndClasses}</p>
        </div>
        <Link href="/teacher/progress" className="shrink-0">
          <Button>
            <ClipboardList className="h-4 w-4" />
            {dict.teacherDashboard.submitProgress}
          </Button>
        </Link>
      </FadeUp>

      <FadeUp delay={0.08} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.common.todaysSchedule}</h2>
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
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.className}</p>
                  {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{dict.exams.room} {e.room}</p>}
                </Card>
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
                <tr key={c.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    {c.class ? `${c.class.name} - ${c.class.section}` : "—"}
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
