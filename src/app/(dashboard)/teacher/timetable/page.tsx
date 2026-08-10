import { getCurrentProfile } from "@/lib/auth";
import { getMySchedule } from "../queries";
import { WeeklyScheduleGrid, type ScheduleEntry } from "@/components/timetable/WeeklyScheduleGrid";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherTimetablePage() {
  const profile = await getCurrentProfile();
  const schedule = await getMySchedule(profile!.id);
  const dict = await getDictionary(await getLocale());

  const entries: ScheduleEntry[] = schedule.map((e) => ({
    id: e.id,
    day_of_week: e.day_of_week,
    start_time: e.start_time,
    end_time: e.end_time,
    subjectName: e.subjectName,
    className: e.className,
    room: e.room,
  }));

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.myTimetable.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.myTimetable.teacherSubtitle}</p>
      </FadeUp>
      <FadeUp delay={0.08}>
        {entries.length === 0 ? (
          <EmptyState title={dict.myTimetable.nothingScheduledYet} description={dict.myTimetable.teacherEmptyDescription} />
        ) : (
          <WeeklyScheduleGrid entries={entries} dict={dict} />
        )}
      </FadeUp>
    </div>
  );
}
