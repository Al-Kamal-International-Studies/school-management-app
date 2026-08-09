"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createUserAction, type ActionState } from "../actions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { ClassRow } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create account"}
    </Button>
  );
}

export function NewUserForm({
  classes,
  students,
}: {
  classes: Pick<ClassRow, "id" | "name" | "section">[];
  students: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  const [role, setRole] = useState<"teacher" | "student" | "parent">("student");

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select label="Role" name="role" value={role} onChange={(e) => setRole(e.target.value as "teacher" | "student" | "parent")}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="parent">Parent</option>
      </Select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full name" name="full_name" required />
        <Input label="Phone (optional)" name="phone" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" required />
        <Input
          label="Temporary password"
          name="password"
          type="text"
          required
          minLength={8}
          hint="At least 8 characters. Share this with them securely — they can change it after signing in."
        />
      </div>

      {role === "teacher" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4">
          <Input label="Employee ID" name="employee_id" required />
          <Input label="Qualification (optional)" name="qualification" />
        </div>
      )}

      {role === "student" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/60 p-4">
          <Input label="Enrollment number" name="enrollment_number" required />
          <Select label="Class (optional)" name="class_id" defaultValue="">
            <option value="">Unassigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </Select>
          <Input label="Date of birth (optional)" name="date_of_birth" type="date" />
          <Input label="Guardian name (optional)" name="guardian_name" />
          <Input label="Guardian phone (optional)" name="guardian_phone" />
          <Input label="Guardian email (optional)" name="guardian_email" type="email" />
          <Input label="Emergency contact name (optional)" name="emergency_contact_name" />
          <Input label="Emergency contact phone (optional)" name="emergency_contact_phone" />
          <Input label="Emergency contact relationship (optional)" name="emergency_contact_relationship" placeholder="e.g. Uncle" />
        </div>
      )}

      {role === "parent" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-800/60">
          <label className="label" htmlFor="child_ids">
            Children (hold Ctrl/Cmd to select multiple)
          </label>
          <select id="child_ids" name="child_ids" multiple size={Math.min(6, Math.max(3, students.length))} className="input bg-white dark:bg-navy-900">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-navy-500">More children can be linked later from this account's page.</p>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
