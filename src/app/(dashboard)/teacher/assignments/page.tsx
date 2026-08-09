import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listMyAssignments, listMyClassSubjectOptions } from "./queries";
import { AssignmentForm } from "./AssignmentForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherAssignmentsPage() {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const [assignments, options] = await Promise.all([listMyAssignments(me.id), listMyClassSubjectOptions(me.id)]);

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.assignments.title}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.assignments.newAssignment}</h2>
          <AssignmentForm options={options} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-4">
        {assignments.length === 0 ? (
          <EmptyState title={dict.assignments.noAssignments} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.assignments.title}</Th>
                <Th>{dict.progress.class}</Th>
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.assignments.dueDate}</Th>
              </tr>
            </Thead>
            <Tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    <Link href={`/teacher/assignments/${a.id}`} className="hover:text-navy-600 dark:hover:text-gold-300">
                      {a.title}
                    </Link>
                  </Td>
                  <Td>{a.className}</Td>
                  <Td>{a.subjectName}</Td>
                  <Td>{a.due_date}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
