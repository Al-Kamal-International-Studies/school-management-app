import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function StudentExamsPage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("class_id").eq("id", me.id).single();
  const exams = student?.class_id
    ? (await supabase.from("exams").select("*").eq("class_id", student.class_id).order("exam_date", { ascending: true })).data ?? []
    : [];

  const subjectIds = [...new Set(exams.map((e) => e.subject_id))];
  const { data: subjects } = subjectIds.length ? await supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] };
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.exams.title}</h1>
      </FadeUp>
      <FadeUp delay={0.05}>
        {exams.length === 0 ? (
          <EmptyState title={dict.exams.noExams} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.assignments.title}</Th>
                <Th>{dict.progress.subject}</Th>
                <Th>{dict.exams.type}</Th>
                <Th>{dict.exams.examDate}</Th>
                <Th>{dict.exams.room}</Th>
              </tr>
            </Thead>
            <Tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{e.title}</Td>
                  <Td>{subjectMap.get(e.subject_id) ?? "Unknown"}</Td>
                  <Td>
                    <Badge tone={e.exam_type === "quiz" ? "gold" : "navy"}>{e.exam_type}</Badge>
                  </Td>
                  <Td>{e.exam_date}</Td>
                  <Td>{e.room ?? "—"}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
