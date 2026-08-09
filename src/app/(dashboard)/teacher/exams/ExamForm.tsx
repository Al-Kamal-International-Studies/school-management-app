"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createExamAction, type ActionState } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { listMyClassSubjectOptions } from "./queries";

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

export function ExamForm({ options }: { options: Awaited<ReturnType<typeof listMyClassSubjectOptions>> }) {
  const [state, formAction] = useActionState(createExamAction, initialState);
  const { dict } = useLocale();
  const firstKey = options[0] ? `${options[0].classId}:${options[0].subjectId}` : "";
  const [target, setTarget] = useState(firstKey);
  const [classId = "", subjectId = ""] = target.split(":");

  if (options.length === 0) {
    return <Alert tone="info">You don't have any classes/subjects assigned yet.</Alert>;
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}

      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="subject_id" value={subjectId} />

      <Select
        label={`${dict.progress.class} — ${dict.progress.subject}`}
        name="target"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      >
        {options.map((o) => (
          <option key={`${o.classId}:${o.subjectId}`} value={`${o.classId}:${o.subjectId}`}>
            {o.className} — {o.subjectName}
          </option>
        ))}
      </Select>

      <Input label={dict.assignments.title} name="title" required />
      <Select label={dict.exams.type} name="exam_type" defaultValue="exam">
        <option value="exam">{dict.exams.exam}</option>
        <option value="quiz">{dict.exams.quiz}</option>
      </Select>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label={dict.exams.examDate} name="exam_date" type="date" required />
        <Input label="Time" name="start_time" type="time" />
        <Input label={dict.exams.room} name="room" />
      </div>

      <SubmitButton />
    </form>
  );
}
