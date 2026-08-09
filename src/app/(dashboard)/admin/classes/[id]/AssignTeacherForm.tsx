"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { assignSubjectTeacherAction, type ActionState } from "../actions";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Assigning…" : "Assign"}
    </Button>
  );
}

export function AssignTeacherForm({
  classId,
  subjects,
  teachers,
}: {
  classId: string;
  subjects: { id: string; name: string; code: string }[];
  teachers: { id: string; full_name: string }[];
}) {
  const [state, formAction] = useActionState(assignSubjectTeacherAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <input type="hidden" name="class_id" value={classId} />
      <div className="w-full sm:w-48">
        <Select label="Subject" name="subject_id" required defaultValue="">
          <option value="" disabled>
            Choose subject
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <Select label="Teacher" name="teacher_id" required defaultValue="">
          <option value="" disabled>
            Choose teacher
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
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
