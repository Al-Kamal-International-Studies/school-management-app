"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAssignmentAction, type ActionState } from "./actions";
import { Input, Textarea, Select } from "@/components/ui/Field";
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

export function AssignmentForm({ options }: { options: Awaited<ReturnType<typeof listMyClassSubjectOptions>> }) {
  const [state, formAction] = useActionState(createAssignmentAction, initialState);
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
      <Textarea label={dict.assignments.description} name="description" />
      <Input label={dict.assignments.dueDate} name="due_date" type="date" required />

      <SubmitButton />
    </form>
  );
}
