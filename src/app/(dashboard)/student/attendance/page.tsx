import { attendanceLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { CalendarCheck } from "lucide-react";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { attendanceRate, ATTENDANCE_WINDOW } from "@/lib/attendance/rate";
import type { AttendanceStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<AttendanceStatus, "green" | "red" | "amber" | "slate"> = {
  present: "green",
  absent: "red",
  late: "amber",
  excused: "slate",
};

export default async function StudentAttendancePage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("student_id", me.id)
    .order("date", { ascending: false })
    .limit(ATTENDANCE_WINDOW);

  const all = records ?? [];
  const count = (status: AttendanceStatus) => all.filter((r) => r.status === status).length;
  const rate = attendanceRate(all);

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.attendance.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.attendance.history}</p>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <FadeUpItem>
          <StatCard label={dict.attendance.title} value={rate !== null ? `${rate}%` : "—"} icon={CalendarCheck} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.attendance.present} value={count("present")} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.attendance.late} value={count("late")} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.attendance.absent} value={count("absent")} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.attendance.excused} value={count("excused")} />
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.1}>
        {all.length === 0 ? (
          <EmptyState title={dict.attendance.noRecords} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.attendance.date}</Th>
                <Th>{dict.attendance.status}</Th>
              </tr>
            </Thead>
            <Tbody>
              {all.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{r.date}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{attendanceLabel(dict, r.status)}</Badge>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
