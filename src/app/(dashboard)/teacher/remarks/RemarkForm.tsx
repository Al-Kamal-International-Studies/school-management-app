"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addRemarkAction, addBehaviourEntryAction, type ActionState } from "./actions";
import { Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.common.submitting : label}
    </Button>
  );
}

export function RemarkForm({ students }: { students: { id: string; full_name: string }[] }) {
  const [state, formAction] = useActionState(addRemarkAction, initialState);
  const { dict } = useLocale();

  if (students.length === 0) return <Alert tone="info">No students assigned yet.</Alert>;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}
      <Select label={dict.progress.student} name="student_id" defaultValue={students[0]?.id}>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </Select>
      <Textarea label={dict.remarks.newRemark} name="remark" required />
      <SubmitButton label={dict.common.submit} />
    </form>
  );
}

export function BehaviourForm({ students }: { students: { id: string; full_name: string }[] }) {
  const [state, formAction] = useActionState(addBehaviourEntryAction, initialState);
  const { dict } = useLocale();

  if (students.length === 0) return <Alert tone="info">No students assigned yet.</Alert>;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}
      <Select label={dict.progress.student} name="student_id" defaultValue={students[0]?.id}>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </Select>
      <Select label={dict.behaviour.category} name="category" defaultValue="positive">
        <option value="positive">{dict.behaviour.positive}</option>
        <option value="negative">{dict.behaviour.negative}</option>
      </Select>
      <Textarea label={dict.behaviour.description} name="description" required />
      <SubmitButton label={dict.common.submit} />
    </form>
  );
}
