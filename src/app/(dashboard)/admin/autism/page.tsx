import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAutismAssignments, listAutismStudentsForSelect, listAutismTeachersForSelect, listAllAutismVideos } from "./queries";
import { AssignForm } from "./AssignForm";
import { RemoveAssignmentButton } from "./RemoveAssignmentButton";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AdminAutismPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const [assignments, teachers, students, videos] = await Promise.all([
    listAutismAssignments(),
    listAutismTeachersForSelect(),
    listAutismStudentsForSelect(),
    listAllAutismVideos(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <FadeUp>
        <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
          {dict.autismSection.adminTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.autismSection.adminSubtitle}</p>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.autismSection.assignments}</h2>
          <AssignForm teachers={teachers} students={students} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.08}>
        {assignments.length === 0 ? (
          <EmptyState title={dict.autismSection.noAssignmentsYet} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.autismSection.student}</Th>
                <Th>{dict.autismSection.teacher}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <Td>{a.studentName}</Td>
                  <Td>{a.teacherName}</Td>
                  <Td>
                    <RemoveAssignmentButton id={a.id} />
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>

      <FadeUp delay={0.12} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.autismSection.allVideos}</h2>
        {videos.length === 0 ? (
          <EmptyState title={dict.autismSection.noVideosYet} />
        ) : (
          <div className="space-y-2">
            {videos.map((v) => (
              <Link key={v.id} href={`/admin/autism/${v.id}`}>
                <Card className="flex items-center justify-between gap-3 card-hover">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy-900 dark:text-white">{v.title || v.studentName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-navy-400">
                      {v.studentName} · {v.uploaderName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-navy-500">{new Date(v.created_at).toLocaleDateString()}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
