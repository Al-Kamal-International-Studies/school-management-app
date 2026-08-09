import { requireRole } from "@/lib/auth";
import { listEligibleProgressTargets, listMyProgressEntries } from "./queries";
import { NewProgressEntryForm } from "./NewProgressEntryForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { computeOverallScore, formatMonth } from "@/lib/progress/calculate";

export default async function TeacherProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; subject?: string; class?: string; month?: string }>;
}) {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const { student, subject, class: classId, month } = await searchParams;

  const [targets, entries] = await Promise.all([
    listEligibleProgressTargets(me.id),
    listMyProgressEntries(me.id, {
      studentId: student || undefined,
      subjectId: subject || undefined,
      classId: classId || undefined,
      month: month ? `${month}-01` : undefined,
    }),
  ]);

  const uniqueStudents = [...new Map(targets.map((t) => [t.studentId, t.studentName])).entries()];
  const uniqueSubjects = [...new Map(targets.map((t) => [t.subjectId, t.subjectName])).entries()];
  const uniqueClasses = [...new Map(targets.map((t) => [t.classId, t.className])).entries()];

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.progress.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.progress.monthlyEntry}</p>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.progress.newEntry}</h2>
          <NewProgressEntryForm targets={targets} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.pastEntries}</h2>

        <form method="get" className="flex flex-wrap gap-3">
          <select name="student" defaultValue={student ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            <option value="">{dict.progress.student}: {dict.progress.filterAll}</option>
            {uniqueStudents.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select name="subject" defaultValue={subject ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            <option value="">{dict.progress.subject}: {dict.progress.filterAll}</option>
            {uniqueSubjects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select name="class" defaultValue={classId ?? ""} className="input w-auto bg-white dark:bg-navy-900">
            <option value="">{dict.progress.class}: {dict.progress.filterAll}</option>
            {uniqueClasses.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
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
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.progress.class}</Th>
                <Th>{dict.progress.month}</Th>
                <Th>{dict.progress.overallScore}</Th>
              </tr>
            </Thead>
            <Tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{e.studentName}</Td>
                  <Td>{e.subjectName}</Td>
                  <Td>{e.className}</Td>
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
