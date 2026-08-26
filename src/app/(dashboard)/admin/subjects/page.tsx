import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "./SubjectForm";
import { DeleteSubjectButton } from "./DeleteSubjectButton";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export default async function SubjectsPage() {
  const supabase = await createClient();
  // admin/layout.tsx's requireRole("admin") guarantees a profile, so this
  // is never actually null — see getActiveCenterForRequest's doc comment.
  // Scoped to the active center — without this a multi-center admin always
  // saw every AKIS+AKET subject combined here regardless of the center
  // switcher (subjects has its own center_id, see 0027_centers.sql).
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: subjects } = await supabase.from("subjects").select("*").eq("center_id", activeCenterId).order("name");
  const dict = await getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminSubjects.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.adminSubjects.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <SubjectForm />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15}>
        {!subjects || subjects.length === 0 ? (
          <EmptyState title={dict.adminSubjects.noSubjectsYet} description={dict.adminSubjects.noSubjectsYetDescription} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.adminSubjects.name}</Th>
                <Th>{dict.adminSubjects.code}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{s.name}</Td>
                  <Td>{s.code}</Td>
                  <Td>
                    <DeleteSubjectButton id={s.id} />
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
