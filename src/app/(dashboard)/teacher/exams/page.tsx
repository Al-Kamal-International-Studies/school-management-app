import { requireRole } from "@/lib/auth";
import { listMyExams, listMyClassSubjectOptions } from "./queries";
import { ExamForm } from "./ExamForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherExamsPage() {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const [exams, options] = await Promise.all([listMyExams(me.id), listMyClassSubjectOptions(me.id)]);

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.exams.title}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.exams.newExam}</h2>
          <ExamForm options={options} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1}>
        {exams.length === 0 ? (
          <EmptyState title={dict.exams.noExams} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.assignments.title}</Th>
                <Th>{dict.progress.class}</Th>
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.exams.type}</Th>
                <Th>{dict.exams.examDate}</Th>
              </tr>
            </Thead>
            <Tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{e.title}</Td>
                  <Td>{e.className}</Td>
                  <Td>{e.subjectName}</Td>
                  <Td>
                    <Badge tone={e.exam_type === "quiz" ? "gold" : "navy"}>{e.exam_type}</Badge>
                  </Td>
                  <Td>{e.exam_date}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
