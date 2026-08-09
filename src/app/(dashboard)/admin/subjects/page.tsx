import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "./SubjectForm";
import { DeleteSubjectButton } from "./DeleteSubjectButton";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("*").order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Subjects</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">School-wide subject list used across classes and timetables.</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <SubjectForm />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15}>
        {!subjects || subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Add your first subject above." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
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
