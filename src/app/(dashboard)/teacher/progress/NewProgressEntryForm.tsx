"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitProgressEntryAction, type ActionState } from "./actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { currentMonthValue } from "@/lib/progress/calculate";
import type { ProgressTarget } from "./queries";

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

export function NewProgressEntryForm({ targets }: { targets: ProgressTarget[] }) {
  const [state, formAction] = useActionState(submitProgressEntryAction, initialState);
  const { dict } = useLocale();
  const firstKey = targets[0] ? `${targets[0].studentId}:${targets[0].subjectId}:${targets[0].classId}` : "";
  const [targetKey, setTargetKey] = useState(firstKey);
  const [studentId = "", subjectId = "", classId = ""] = targetKey.split(":");

  if (targets.length === 0) {
    return (
      <Alert tone="info">
        You don't have any classes/subjects assigned yet, so there's no one to submit a progress entry for. Contact your
        administrator.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.progress.entrySubmitted}</Alert>}

      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="class_id" value={classId} />

      <Select
        label={`${dict.progress.student} — ${dict.progress.subject}`}
        name="target"
        value={targetKey}
        onChange={(e) => setTargetKey(e.target.value)}
      >
        {targets.map((t) => (
          <option key={`${t.studentId}:${t.subjectId}:${t.classId}`} value={`${t.studentId}:${t.subjectId}:${t.classId}`}>
            {t.studentName} — {t.subjectName} ({t.className})
          </option>
        ))}
      </Select>

      <Input label={dict.progress.month} name="month" type="month" defaultValue={currentMonthValue().slice(0, 7)} required />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.progress.attendance} name="attendance_percentage" type="number" min={0} max={100} step="0.1" required />
        <Input label={dict.progress.homeworkCompletion} name="homework_completion" type="number" min={0} max={100} step="0.1" required />
        <Input label={dict.progress.classParticipation} name="class_participation" type="number" min={0} max={100} step="0.1" required />
        <Input label={dict.progress.behaviourConduct} name="behaviour_conduct" type="number" min={0} max={100} step="0.1" required />
        <Input
          label={dict.progress.assessmentPerformance}
          name="assessment_performance"
          type="number"
          min={0}
          max={100}
          step="0.1"
          required
        />
        <Input
          label={dict.progress.subjectUnderstanding}
          name="subject_understanding"
          type="number"
          min={0}
          max={100}
          step="0.1"
          required
        />
      </div>

      <Textarea label={dict.progress.teacherComments} name="teacher_comments" />
      <Textarea label={dict.progress.improvementAreas} name="improvement_priority_areas" />

      <SubmitButton />
    </form>
  );
}
