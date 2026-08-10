"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateUserAction, type ActionState } from "../actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { ClassRow, Profile, Student, Teacher } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: ActionState = {};

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.saving : dict.common.saveChanges}
    </Button>
  );
}

export function EditUserForm({
  profile,
  student,
  teacher,
  classes,
  allStudents,
  linkedChildIds,
  dict,
}: {
  profile: Profile;
  student: Student | null;
  teacher: Teacher | null;
  classes: Pick<ClassRow, "id" | "name" | "section">[];
  allStudents?: { id: string; label: string }[];
  linkedChildIds?: string[];
  dict: Dictionary;
}) {
  const [state, formAction] = useActionState(updateUserAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={profile.id} />
      <input type="hidden" name="role" value={profile.role} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.adminUsers.fullName} name="full_name" defaultValue={profile.full_name} required />
        <Input label={dict.common.phone} name="phone" defaultValue={profile.phone ?? ""} />
      </div>

      <div>
        <span className="label">{dict.common.email}</span>
        <p className="text-sm text-slate-500 dark:text-navy-400">{profile.email} ({dict.adminUsers.emailChangeHint})</p>
      </div>

      {profile.role === "student" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-navy-400">
            {dict.adminUsers.enrollmentNumberLabel}: <span className="font-medium text-slate-700 dark:text-navy-100">{student?.enrollment_number}</span>
          </p>
          <Select label={dict.adminUsers.class} name="class_id" defaultValue={student?.class_id ?? ""}>
            <option value="">{dict.adminUsers.unassigned}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </Select>
        </div>
      )}

      {profile.role === "teacher" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-navy-400">
            {dict.adminUsers.employeeId}: <span className="font-medium text-slate-700 dark:text-navy-100">{teacher?.employee_id}</span>
          </p>
          <Input label={dict.adminUsers.qualification} name="qualification" defaultValue={teacher?.qualification ?? ""} />
        </div>
      )}

      {profile.role === "parent" && allStudents && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-800/60">
          <label className="label" htmlFor="child_ids">
            {dict.adminUsers.children}
          </label>
          <select
            id="child_ids"
            name="child_ids"
            multiple
            size={Math.min(6, Math.max(3, allStudents.length))}
            defaultValue={linkedChildIds ?? []}
            className="input bg-white dark:bg-navy-900"
          >
            {allStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <SubmitButton dict={dict} />
    </form>
  );
}
