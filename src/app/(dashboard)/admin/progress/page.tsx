import { requireRole } from "@/lib/auth";
import { listAllProgressEntries, listAllClassesForFilter, listAllStudentsForFilter } from "./queries";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { computeOverallScore, formatMonth } from "@/lib/progress/calculate";

export default async function AdminProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; class?: string; month?: string }>;
}) {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const { student, class: classId, month } = await searchParams;

  const [entries, classes, students] = await Promise.all([
    listAllProgressEntries({ studentId: student || undefined, classId: classId || undefined, month: month ? `${month}-01` : undefined }),
    listAllClassesForFilter(),
    listAllStudentsForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <FadeUp className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.progress.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
            All monthly progress entries submitted by teachers, school-wide.
          </p>
        </div>
        <ExportCsvButton
          rows={entries.map((e) => ({
            student: e.studentName,
            class: e.className,
            subject: e.subjectName,
            teacher: e.teacherName,
            month: formatMonth(e.month),
            score: computeOverallScore(e).toFixed(1),
          }))}
          columns={[
            { key: "student", header: "Student" },
            { key: "class", header: "Class" },
            { key: "subject", header: "Subject" },
            { key: "teacher", header: "Teacher" },
            { key: "month", header: "Month" },
            { key: "score", header: "Overall Score" },
          ]}
          filename="progress"
        />
      </FadeUp>

      <FadeUp delay={0.05} className="space-y-4">
        <form method="get" className="flex flex-wrap gap-3">
          <select name="student" defaultValue={student ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            <option value="">{dict.progress.student}: {dict.progress.filterAll}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
          <select name="class" defaultValue={classId ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            <option value="">{dict.progress.class}: {dict.progress.filterAll}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </select>
          <input type="month" name="month" defaultValue={month ?? ""} className="input w-auto" />
          <button type="submit" className="btn-secondary">
            {dict.common.submit}
          </button>
        </form>

        {entries.length === 0 ? (
          <EmptyState title={dict.progress.noEntriesYet} description={dict.progress.noEntriesYetDescription} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.progress.student}</Th>
                <Th>{dict.progress.class}</Th>
                <Th>{dict.progress.subject}</Th>
                <Th>Teacher</Th>
                <Th>{dict.progress.month}</Th>
                <Th>{dict.progress.overallScore}</Th>
              </tr>
            </Thead>
            <Tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{e.studentName}</Td>
                  <Td>{e.className}</Td>
                  <Td>{e.subjectName}</Td>
                  <Td>{e.teacherName}</Td>
                  <Td>{formatMonth(e.month)}</Td>
                  <Td>{computeOverallScore(e).toFixed(1)}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
