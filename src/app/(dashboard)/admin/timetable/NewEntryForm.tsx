"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTimetableEntryAction, type ActionState } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DAY_NAMES } from "@/lib/utils";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add period"}
    </Button>
  );
}

export function NewEntryForm({
  classId,
  assignableSubjects,
}: {
  classId: string;
  assignableSubjects: { subjectId: string; subjectName: string; teacherId: string; teacherName: string }[];
}) {
  const [state, formAction] = useActionState(createTimetableEntryAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="class_id" value={classId} />

      <Select
        label="Subject (teacher assigned automatically)"
        name="subject_teacher"
        required
        defaultValue=""
        onChange={(e) => {
          const [subjectId, teacherId] = e.target.value.split("|");
          const form = e.target.form!;
          (form.elements.namedItem("subject_id") as HTMLInputElement).value = subjectId ?? "";
          (form.elements.namedItem("teacher_id") as HTMLInputElement).value = teacherId ?? "";
        }}
      >
        <option value="" disabled>
          Choose subject
        </option>
        {assignableSubjects.map((a) => (
          <option key={a.subjectId} value={`${a.subjectId}|${a.teacherId}`}>
            {a.subjectName} — {a.teacherName}
          </option>
        ))}
      </Select>
      <input type="hidden" name="subject_id" />
      <input type="hidden" name="teacher_id" />

      <Select label="Day" name="day_of_week" required defaultValue="1">
        {DAY_NAMES.slice(1).map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Start time" name="start_time" type="time" required />
        <Input label="End time" name="end_time" type="time" required />
      </div>
      <Input label="Room (optional)" name="room" />

      <SubmitButton />
    </form>
  );
}
