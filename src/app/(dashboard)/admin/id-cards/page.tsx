import Link from "next/link";
import { listUsers } from "../users/queries";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { FadeUp } from "@/components/motion/FadeUp";
import { initials } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export default async function AdminIdCardsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  // admin/layout.tsx's requireRole("admin") guarantees a profile, so this
  // is never actually null — see getActiveCenterForRequest's own doc
  // comment (same pattern admin/users/page.tsx already uses).
  const activeCenterId = (await getActiveCenterForRequest())!;
  const students = await listUsers({ role: "student", q }, activeCenterId);
  const dict = await getDictionary(await getLocale());

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.idCard.listTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.idCard.listSubtitleAdmin}</p>
      </FadeUp>

      <FadeUp delay={0.06}>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="q">
              {dict.common.search}
            </label>
            <input id="q" name="q" defaultValue={q} placeholder={dict.adminUsers.searchPlaceholder} className="input" />
          </div>
          <Button type="submit" variant="secondary">
            {dict.common.filter}
          </Button>
        </form>
      </FadeUp>

      <FadeUp delay={0.12}>
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
                    <Link href={`/admin/id-cards/${s.id}`} className="flex items-center gap-3 hover:text-navy-600 dark:hover:text-gold-300">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-gradient text-xs font-semibold text-white">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                        ) : (
                          initials(s.full_name)
                        )}
                      </span>
                      {s.full_name}
                    </Link>
                  </Td>
                  <Td>{s.className ?? dict.idCard.notAssigned}</Td>
                  <Td>{s.student?.enrollment_number}</Td>
                  <Td>
                    <Link href={`/admin/id-cards/${s.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
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
