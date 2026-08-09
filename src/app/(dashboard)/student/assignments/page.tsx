import { requireRole } from "@/lib/auth";
import { listMyAssignments } from "./queries";
import { SubmitAssignmentButton } from "./SubmitAssignmentButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function StudentAssignmentsPage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const assignments = await listMyAssignments(me.id);

  return (
    <div className="space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.assignments.mySubmissions}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        {assignments.length === 0 ? (
          <EmptyState title={dict.assignments.noAssignments} />
        ) : (
          <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" staggerDelay={0.05}>
            {assignments.map((a) => {
              const status = a.submission?.status ?? "pending";
              const tone = status === "graded" ? "green" : status === "submitted" ? "gold" : "slate";
              const label = status === "graded" ? dict.assignments.graded : status === "submitted" ? dict.assignments.submitted : dict.assignments.pending;
              return (
                <FadeUpItem key={a.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-900 dark:text-white">{a.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">
                          {a.subjectName} · Due {a.due_date}
                        </p>
                      </div>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    {a.description && <p className="mt-2 text-sm text-slate-600 dark:text-navy-200">{a.description}</p>}
                    {a.submission?.status === "graded" && (
                      <p className="mt-3 text-sm font-medium text-navy-900 dark:text-white">
                        {dict.assignments.grade}: {a.submission.grade}
                        {a.submission.feedback && <span className="block text-xs font-normal text-slate-500 dark:text-navy-400">{a.submission.feedback}</span>}
                      </p>
                    )}
                    {status === "pending" && (
                      <div className="mt-3">
                        <SubmitAssignmentButton assignmentId={a.id} />
                      </div>
                    )}
                  </Card>
                </FadeUpItem>
              );
            })}
          </FadeUpStagger>
        )}
      </FadeUp>
    </div>
  );
}
