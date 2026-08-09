import { getCurrentProfile } from "@/lib/auth";
import { getMySchedule } from "../queries";
import { WeeklyScheduleGrid, type ScheduleEntry } from "@/components/timetable/WeeklyScheduleGrid";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function TeacherTimetablePage() {
  const profile = await getCurrentProfile();
  const schedule = await getMySchedule(profile!.id);

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
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">My timetable</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">Every class you teach, across the week.</p>
      </FadeUp>
      <FadeUp delay={0.08}>
        {entries.length === 0 ? (
          <EmptyState title="Nothing scheduled yet" description="Your admin hasn't built your timetable yet." />
        ) : (
          <WeeklyScheduleGrid entries={entries} />
        )}
      </FadeUp>
    </div>
  );
}
