import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listMyStudents } from "../queries";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { initials } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherIdCardsPage() {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const students = await listMyStudents(me.id);

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.idCard.listTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.idCard.listSubtitleTeacher}</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        {students.length === 0 ? (
          <EmptyState title={dict.idCard.noStudents} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.common.name}</Th>
                <Th>{dict.idCard.gradeClass}</Th>
                <Th>{dict.idCard.studentIdLabel}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    <Link href={`/teacher/id-cards/${s.id}`} className="flex items-center gap-3 hover:text-navy-600 dark:hover:text-gold-300">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-gradient text-xs font-semibold text-white">
                        {s.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatarUrl} alt={s.fullName} className="h-full w-full object-cover" />
                        ) : (
                          initials(s.fullName)
                        )}
                      </span>
                      {s.fullName}
                    </Link>
                  </Td>
                  <Td>{s.className ?? dict.idCard.notAssigned}</Td>
                  <Td>{s.enrollmentNumber}</Td>
                  <Td>
                    <Link href={`/teacher/id-cards/${s.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
                      {dict.idCard.viewCard}
                    </Link>
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
