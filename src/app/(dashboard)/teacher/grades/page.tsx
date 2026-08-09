import { requireRole } from "@/lib/auth";
import { listMyGrades, listMyGradeTargets } from "./queries";
import { GradeForm } from "./GradeForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherGradesPage() {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const [grades, targets] = await Promise.all([listMyGrades(me.id), listMyGradeTargets(me.id)]);

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.grades.title}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.grades.newGrade}</h2>
          <GradeForm targets={targets} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1}>
        {grades.length === 0 ? (
          <EmptyState title={dict.grades.noGrades} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.progress.student}</Th>
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.grades.assessment}</Th>
                <Th>{dict.grades.marksObtained}/{dict.grades.marksTotal}</Th>
                <Th>{dict.grades.term}</Th>
              </tr>
            </Thead>
            <Tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{g.studentName}</Td>
                  <Td>{g.subjectName}</Td>
                  <Td>{g.assessment_name}</Td>
                  <Td>
                    {g.marks_obtained}/{g.marks_total}
                  </Td>
                  <Td>{g.term}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
