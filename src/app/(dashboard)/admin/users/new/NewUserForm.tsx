"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createUserAction, type ActionState } from "../actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { ClassRow } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: ActionState = {};

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.creating : dict.adminUsers.createAccount}
    </Button>
  );
}

export function NewUserForm({
  classes,
  students,
  dict,
}: {
  classes: Pick<ClassRow, "id" | "name" | "section">[];
  students: { id: string; label: string }[];
  dict: Dictionary;
}) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  const [role, setRole] = useState<"teacher" | "student" | "parent">("student");

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select label={dict.common.role} name="role" value={role} onChange={(e) => setRole(e.target.value as "teacher" | "student" | "parent")}>
        <option value="student">{dict.common.roleStudent}</option>
        <option value="teacher">{dict.common.roleTeacher}</option>
        <option value="parent">{dict.common.roleParent}</option>
      </Select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.adminUsers.fullName} name="full_name" required />
        <Input label={dict.adminUsers.phoneOptional} name="phone" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.common.email} name="email" type="email" required />
        <Input
          label={dict.adminUsers.tempPassword}
          name="password"
          type="text"
          required
          minLength={8}
          hint={dict.adminUsers.tempPasswordHint}
        />
      </div>

      {role === "teacher" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4">
          <Input label={dict.adminUsers.employeeId} name="employee_id" required />
          <Input label={dict.adminUsers.qualificationOptional} name="qualification" />
        </div>
      )}

      {role === "student" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4">
          <Input label={dict.adminUsers.enrollmentNumber} name="enrollment_number" required />
          <Select label={dict.adminUsers.classOptional} name="class_id" defaultValue="">
            <option value="">{dict.adminUsers.unassigned}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </Select>
          <Input label={dict.adminUsers.dobOptional} name="date_of_birth" type="date" />
          <Input label={dict.adminUsers.guardianNameOptional} name="guardian_name" />
          <Input label={dict.adminUsers.guardianPhoneOptional} name="guardian_phone" />
          <Input label={dict.adminUsers.guardianEmailOptional} name="guardian_email" type="email" />
          <Input label={dict.adminUsers.emergencyContactNameOptional} name="emergency_contact_name" />
          <Input label={dict.adminUsers.emergencyContactPhoneOptional} name="emergency_contact_phone" />
          <Input label={dict.adminUsers.emergencyContactRelationshipOptional} name="emergency_contact_relationship" placeholder="e.g. Uncle" />
        </div>
      )}

      {role === "parent" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-800/60">
          <label className="label" htmlFor="child_ids">
            {dict.adminUsers.children}
          </label>
          <select id="child_ids" name="child_ids" multiple size={Math.min(6, Math.max(3, students.length))} className="input bg-white dark:bg-navy-900">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-navy-500">{dict.adminUsers.childrenHint}</p>
        </div>
      )}

      <SubmitButton dict={dict} />
    </form>
  );
}
