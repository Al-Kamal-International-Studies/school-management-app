import { requireRole } from "@/lib/auth";
import { listMyAttendanceClasses, listStudentsInClass, getAttendanceForClassDate, listMyAttendanceHistory } from "./queries";
import { AttendanceForm } from "./AttendanceForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { AttendanceStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<AttendanceStatus, "green" | "red" | "amber" | "slate"> = {
  present: "green",
  absent: "red",
  late: "amber",
  excused: "slate",
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const { class: classParam, date: dateParam } = await searchParams;

  const classes = await listMyAttendanceClasses(me.id);
  const classId = classParam || classes[0]?.id;
  const date = dateParam || todayValue();

  const [students, existingRecords, history] = await Promise.all([
    classId ? listStudentsInClass(classId) : Promise.resolve([]),
    classId ? getAttendanceForClassDate(classId, date) : Promise.resolve([]),
    listMyAttendanceHistory(me.id, {}),
  ]);

  const existing: Record<string, AttendanceStatus> = Object.fromEntries(existingRecords.map((r) => [r.student_id, r.status]));

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.attendance.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.attendance.markAttendance}</p>
      </FadeUp>

      <FadeUp delay={0.05} className="space-y-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <select name="class" defaultValue={classId ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </select>
          <input type="date" name="date" defaultValue={date} className="input w-auto" />
          <button type="submit" className="btn-secondary">
            {dict.common.continue}
          </button>
        </form>

        {!classId ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">
              You don't have any classes assigned yet, so there's no attendance to mark.
            </p>
          </Card>
        ) : students.length === 0 ? (
          <EmptyState title="No students in this class" />
        ) : (
          <Card>
            <AttendanceForm classId={classId} date={date} students={students} existing={existing} />
          </Card>
        )}
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.attendance.history}</h2>
        {history.length === 0 ? (
          <EmptyState title={dict.attendance.noRecords} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.progress.student}</Th>
                <Th>{dict.attendance.date}</Th>
                <Th>{dict.attendance.status}</Th>
              </tr>
            </Thead>
            <Tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{r.studentName}</Td>
                  <Td>{r.date}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
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
