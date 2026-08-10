"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordGradeAction, type ActionState } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { listMyGradeTargets } from "./queries";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.common.submitting : dict.common.submit}
    </Button>
  );
}

export function GradeForm({ targets }: { targets: Awaited<ReturnType<typeof listMyGradeTargets>> }) {
  const [state, formAction] = useActionState(recordGradeAction, initialState);
  const { dict } = useLocale();
  const firstKey = targets[0] ? `${targets[0].studentId}:${targets[0].subjectId}:${targets[0].classId}` : "";
  const [target, setTarget] = useState(firstKey);
  const [studentId = "", subjectId = "", classId = ""] = target.split(":");

  if (targets.length === 0) {
    return <Alert tone="info">{dict.common.noClassesOrSubjectsAssigned}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}

      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="class_id" value={classId} />

      <Select label={`${dict.progress.student} — ${dict.progress.subject}`} name="target" value={target} onChange={(e) => setTarget(e.target.value)}>
        {targets.map((t) => (
          <option key={`${t.studentId}:${t.subjectId}:${t.classId}`} value={`${t.studentId}:${t.subjectId}:${t.classId}`}>
            {t.studentName} — {t.subjectName} ({t.className})
          </option>
        ))}
      </Select>

      <Input label={dict.grades.assessment} name="assessment_name" placeholder="Mid-term test" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label={dict.grades.marksObtained} name="marks_obtained" type="number" min={0} step="0.1" required />
        <Input label={dict.grades.marksTotal} name="marks_total" type="number" min={1} step="0.1" required />
        <Input label={dict.grades.term} name="term" defaultValue="Term 1" required />
      </div>

      <SubmitButton />
    </form>
  );
}
