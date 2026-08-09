import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAssignmentDetail } from "../queries";
import { GradeRow } from "./GradeRow";
import { Card } from "@/components/ui/Card";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("teacher");
  const { id } = await params;
  const detail = await getAssignmentDetail(id);
  if (!detail || detail.assignment.teacher_id !== me.id) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{detail.assignment.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">Due {detail.assignment.due_date}</p>
        {detail.assignment.description && (
          <p className="mt-3 text-sm text-slate-600 dark:text-navy-200">{detail.assignment.description}</p>
        )}
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          {detail.roster.map((r) => (
            <GradeRow
              key={r.studentId}
              assignmentId={detail.assignment.id}
              studentId={r.studentId}
              studentName={r.studentName}
              enrollmentNumber={r.enrollmentNumber}
              submission={r.submission}
            />
          ))}
        </Card>
      </FadeUp>
    </div>
  );
}
