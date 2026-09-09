import { listClassesForSelect, getClassSchedule } from "@/lib/timetable/builderQueries";
import { NewEntryForm } from "@/components/timetable/builder/NewEntryForm";
import { DeleteEntryButton } from "@/components/timetable/builder/DeleteEntryButton";
import { ClassSelect } from "@/components/timetable/builder/ClassSelect";
import { WeeklyScheduleGrid, type ScheduleEntry } from "@/components/timetable/WeeklyScheduleGrid";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

/**
 * The teacher-side twin of /admin/timetable — same shared queries/actions/
 * components, same "pick a class, add/remove periods for it" capability,
 * not limited to classes this teacher is assigned to. Muhammad, chat,
 * 2026-09-09: "give the teachers the exact same access for creating
 * timetables that the admins have." Deliberately a separate route from
 * /teacher/timetable (that page is this teacher's own read-only weekly
 * schedule across every class they teach — a different question from "build
 * a class's timetable" — so it's left untouched).
 */
export default async function TeacherTimetableBuilderPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classParam } = await searchParams;
  // teacher/layout.tsx's requireRole("teacher") guarantees a profile, so
  // this is never actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const classes = await listClassesForSelect(activeCenterId);
  const selectedClassId = classParam ?? classes[0]?.id;
  const schedule = selectedClassId ? await getClassSchedule(selectedClassId) : null;
  const dict = await getDictionary(await getLocale());

  const entries: ScheduleEntry[] =
    schedule?.entries.map((e) => ({
      id: e.id,
      day_of_week: e.day_of_week,
      start_time: e.start_time,
      end_time: e.end_time,
      subjectName: e.subjectName,
      teacherName: e.teacherName,
      room: e.room,
      actions: <DeleteEntryButton id={e.id} />,
    })) ?? [];

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminTimetable.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.adminTimetable.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.06}>
        <ClassSelect classes={classes} selectedClassId={selectedClassId} />
      </FadeUp>

      {!selectedClassId ? (
        <EmptyState title={dict.adminTimetable.noClassesYet} description={dict.adminTimetable.noClassesYetDescription} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <FadeUp delay={0.12} className="card h-fit p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.adminTimetable.addPeriod}</h2>
            {schedule && schedule.assignableSubjects.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-navy-400">
                {dict.adminTimetable.assignTeacherFirst}
              </p>
            ) : (
              <NewEntryForm classId={selectedClassId} assignableSubjects={schedule?.assignableSubjects ?? []} />
            )}
          </FadeUp>
          <FadeUp delay={0.18}>
            <WeeklyScheduleGrid entries={entries} dict={dict} />
          </FadeUp>
        </div>
      )}
    </div>
  );
}
