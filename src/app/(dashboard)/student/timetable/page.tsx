import { getCurrentProfile } from "@/lib/auth";
import { getMyClassInfo, getMySchedule } from "../queries";
import { WeeklyScheduleGrid, type ScheduleEntry } from "@/components/timetable/WeeklyScheduleGrid";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function StudentTimetablePage() {
  const profile = await getCurrentProfile();
  const { student, classRow } = await getMyClassInfo(profile!.id);
  const schedule = await getMySchedule(student?.class_id ?? null);

  const entries: ScheduleEntry[] = schedule.map((e) => ({
    id: e.id,
    day_of_week: e.day_of_week,
    start_time: e.start_time,
    end_time: e.end_time,
    subjectName: e.subjectName,
    teacherName: e.teacherName,
    room: e.room,
  }));

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">My timetable</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{classRow ? `${classRow.name} - ${classRow.section}` : ""}</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        {!classRow ? (
          <Alert tone="info">You haven't been assigned to a class yet. Contact your school administrator.</Alert>
        ) : entries.length === 0 ? (
          <EmptyState title="Nothing scheduled yet" description="Your school hasn't published a timetable yet." />
        ) : (
          <WeeklyScheduleGrid entries={entries} />
        )}
      </FadeUp>
    </div>
  );
}
