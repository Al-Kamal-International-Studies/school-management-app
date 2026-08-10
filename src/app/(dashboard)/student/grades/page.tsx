import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function StudentGradesPage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();

  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .eq("student_id", me.id)
    .order("created_at", { ascending: false });

  const all = grades ?? [];
  const subjectIds = [...new Set(all.map((g) => g.subject_id))];
  const { data: subjects } = subjectIds.length ? await supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] };
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.grades.title}</h1>
      </FadeUp>
      <FadeUp delay={0.05}>
        {all.length === 0 ? (
          <EmptyState title={dict.grades.noGrades} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.grades.assessment}</Th>
                <Th>{dict.grades.marksObtained}/{dict.grades.marksTotal}</Th>
                <Th>{dict.grades.term}</Th>
              </tr>
            </Thead>
            <Tbody>
              {all.map((g) => (
                <tr key={g.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{subjectMap.get(g.subject_id) ?? dict.common.unknown}</Td>
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
