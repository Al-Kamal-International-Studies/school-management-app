"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { gradeSubmissionAction, type ActionState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AssignmentSubmission } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending} className="shrink-0">
      Save
    </Button>
  );
}

export function GradeRow({
  assignmentId,
  studentId,
  studentName,
  enrollmentNumber,
  submission,
}: {
  assignmentId: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  submission: AssignmentSubmission | null;
}) {
  const [state, formAction] = useActionState(gradeSubmissionAction, initialState);
  const { dict } = useLocale();

  const statusTone = submission?.status === "graded" ? "green" : submission?.status === "submitted" ? "gold" : "slate";
  const statusLabel = submission?.status === "graded" ? dict.assignments.graded : submission?.status === "submitted" ? dict.assignments.submitted : dict.assignments.pending;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-navy-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{studentName}</p>
        <p className="text-xs text-slate-400 dark:text-navy-500">{enrollmentNumber}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        {state.error && <span className="text-xs text-red-600">{state.error}</span>}
        <input type="hidden" name="assignment_id" value={assignmentId} />
        <input type="hidden" name="student_id" value={studentId} />
        <input
          type="number"
          name="grade"
          min={0}
          max={100}
          step="0.1"
          defaultValue={submission?.grade ?? ""}
          placeholder={dict.assignments.grade}
          className="input w-24 py-1.5 text-sm"
        />
        <input
          type="text"
          name="feedback"
          defaultValue={submission?.feedback ?? ""}
          placeholder={dict.assignments.feedback}
          className="input w-40 py-1.5 text-sm"
        />
        <SaveButton />
      </form>
    </div>
  );
}
