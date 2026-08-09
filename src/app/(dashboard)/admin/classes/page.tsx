import Link from "next/link";
import { listClassesWithCounts } from "./queries";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function ClassesPage() {
  const classes = await listClassesWithCounts();

  return (
    <div className="space-y-8">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Classes</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">Sections, homeroom teachers, and enrollment.</p>
        </div>
        <Link href="/admin/classes/new">
          <Button>Create class</Button>
        </Link>
      </FadeUp>

      <FadeUp delay={0.08}>
        {classes.length === 0 ? (
          <EmptyState title="No classes yet" description="Create your first class/section to start enrolling students." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Class</Th>
                <Th>Academic year</Th>
                <Th>Homeroom teacher</Th>
                <Th>Students</Th>
              </tr>
            </Thead>
            <Tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    <Link href={`/admin/classes/${c.id}`} className="hover:text-navy-600">
                      {c.name} - {c.section}
                    </Link>
                  </Td>
                  <Td>{c.academic_year}</Td>
                  <Td>{c.homeroomTeacherName ?? "—"}</Td>
                  <Td>{c.studentCount}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
