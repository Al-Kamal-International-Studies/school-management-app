import { getDayNames, formatTime } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";

export interface ScheduleEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subjectName: string;
  teacherName?: string;
  className?: string;
  room?: string | null;
  actions?: React.ReactNode;
}

// Monday(1) .. Saturday(6) — most schools don't hold classes Sunday, but any
// entry saved with day_of_week=7 will still render if present.
const DAYS_TO_SHOW = [1, 2, 3, 4, 5, 6, 7];

export function WeeklyScheduleGrid({
  entries,
  dict,
  layout = "full",
}: {
  entries: ScheduleEntry[];
  dict: Dictionary;
  /** "full": the grid owns the content width (six days across from 2xl, where each column clears its time ranges).
   *  "beside-form": it shares the row with the 320px add-period form on the
   *  builder pages, so it tops out at three days across to keep each day
   *  column wide enough for its time ranges. */
  layout?: "full" | "beside-form";
}) {
  const dayNames = getDayNames(dict);
  const byDay = new Map<number, ScheduleEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.day_of_week) ?? [];
    list.push(entry);
    byDay.set(entry.day_of_week, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const daysWithData = DAYS_TO_SHOW.filter((d) => d !== 7 || byDay.has(7));

  return (
    <div
      className={
        layout === "full"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
          : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {daysWithData.map((day) => {
        const dayEntries = byDay.get(day) ?? [];
        return (
          <div key={day} className="card p-4">
            <h3 className="mb-3 border-b border-slate-100 pb-2.5 text-sm font-semibold text-slate-900 dark:border-navy-800 dark:text-white">{dayNames[day]}</h3>
            {dayEntries.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-navy-500">{dict.common.noClasses}</p>
            ) : (
              <ul className="space-y-3">
                {dayEntries.map((e) => (
                  <li key={e.id} className="border-s-2 border-navy-600 py-0.5 ps-2.5 dark:border-navy-300">
                    <p className="tabular whitespace-nowrap text-xs font-medium text-slate-500 dark:text-navy-400">
                      <bdi dir="ltr">{formatTime(e.start_time)} – {formatTime(e.end_time)}</bdi>
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{e.subjectName}</p>
                    {e.className && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.className}</p>}
                    {e.teacherName && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{e.teacherName}</p>}
                    {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{dict.exams.room} <bdi>{e.room}</bdi></p>}
                    {e.actions}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
