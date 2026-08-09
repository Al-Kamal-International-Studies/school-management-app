import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassDetail } from "../queries";
import { ClassForm } from "../ClassForm";
import { AssignTeacherForm } from "./AssignTeacherForm";
import { RemoveAssignmentButton } from "./RemoveAssignmentButton";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const { classRow, assignments, students, subjects, teachers } = detail;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {classRow.name} - {classRow.section}
        </h1>
        <p className="text-sm text-slate-500 dark:text-navy-400">{classRow.academic_year} academic year</p>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">Class details</h2>
        <ClassForm classRow={classRow} teachers={teachers} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">Subject teachers</h2>
        <AssignTeacherForm classId={classRow.id} subjects={subjects} teachers={teachers} />
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">No subjects assigned yet.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Subject</Th>
                <Th>Teacher</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <Td>{a.subject?.name ?? "—"}</Td>
                  <Td>{a.teacher?.full_name ?? "—"}</Td>
                  <Td>
                    <RemoveAssignmentButton id={a.id} classId={classRow.id} />
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">Students ({students.length})</h2>
        {students.length === 0 ? (
          <EmptyState
            title="No students in this class yet"
            description="Assign students to this class from the user management page."
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Enrollment number</Th>
              </tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/admin/users/${s.id}`} className="font-medium text-slate-900 dark:text-white hover:text-brand-600">
                      {s.full_name}
                    </Link>
                  </Td>
                  <Td>{s.enrollment_number}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
