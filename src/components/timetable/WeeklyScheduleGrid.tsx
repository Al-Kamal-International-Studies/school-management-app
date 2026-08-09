import { DAY_NAMES, formatTime } from "@/lib/utils";

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

export function WeeklyScheduleGrid({ entries }: { entries: ScheduleEntry[] }) {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {daysWithData.map((day) => {
        const dayEntries = byDay.get(day) ?? [];
        return (
          <div key={day} className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">{DAY_NAMES[day]}</h3>
            {dayEntries.length === 0 ? (
              <p className="text-xs text-slate-400">No classes</p>
            ) : (
              <ul className="space-y-2.5">
                {dayEntries.map((e) => (
                  <li key={e.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      {formatTime(e.start_time)} – {formatTime(e.end_time)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{e.subjectName}</p>
                    {e.className && <p className="mt-0.5 text-xs text-slate-500">{e.className}</p>}
                    {e.teacherName && <p className="mt-0.5 text-xs text-slate-500">{e.teacherName}</p>}
                    {e.room && <p className="mt-0.5 text-xs text-slate-500">Room {e.room}</p>}
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
