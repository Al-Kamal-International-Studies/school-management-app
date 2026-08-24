"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAutismAssignmentAction, type ActionState } from "./actions";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? dict.common.assigning : dict.common.assign}
    </Button>
  );
}

export function AssignForm({
  teachers,
  students,
}: {
  teachers: { id: string; full_name: string }[];
  students: { id: string; full_name: string }[];
}) {
  const [state, formAction] = useActionState(createAutismAssignmentAction, initialState);
  const { dict } = useLocale();

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full sm:w-56">
        <Select label={dict.autismSection.teacher} name="teacher_id" required defaultValue="">
          <option value="" disabled>
            {dict.autismSection.chooseTeacher}
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-56">
        <Select label={dict.autismSection.student} name="student_id" required defaultValue="">
          <option value="" disabled>
            {dict.autismSection.chooseStudent}
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton />
      {state.error && (
        <div className="basis-full">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
