"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClassAction, updateClassAction, type ActionState } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ClassRow } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.saving : label}
    </Button>
  );
}

export function ClassForm({
  classRow,
  teachers,
}: {
  classRow?: ClassRow;
  teachers: { id: string; full_name: string }[];
}) {
  const action = classRow ? updateClassAction : createClassAction;
  const [state, formAction] = useActionState(action, initialState);
  const { dict } = useLocale();

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {classRow && <input type="hidden" name="id" value={classRow.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.adminClasses.className} name="name" placeholder="Grade 9" defaultValue={classRow?.name} required />
        <Input label={dict.adminClasses.section} name="section" placeholder="A" defaultValue={classRow?.section} required />
      </div>
      <Input
        label={dict.adminClasses.academicYear}
        name="academic_year"
        placeholder={String(new Date().getFullYear())}
        defaultValue={classRow?.academic_year ?? String(new Date().getFullYear())}
        required
      />
      <Select label={dict.adminClasses.homeroomTeacherOptional} name="homeroom_teacher_id" defaultValue={classRow?.homeroom_teacher_id ?? ""}>
        <option value="">{dict.adminUsers.unassigned}</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
          </option>
        ))}
      </Select>

      <SubmitButton label={classRow ? dict.common.saveChanges : dict.adminClasses.createClass} />
    </form>
  );
}
