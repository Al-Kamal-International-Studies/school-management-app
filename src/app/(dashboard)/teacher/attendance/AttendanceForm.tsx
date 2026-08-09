"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { markAttendanceAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AttendanceStatus } from "@/lib/types/database.types";

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

export function AttendanceForm({
  classId,
  date,
  students,
  existing,
}: {
  classId: string;
  date: string;
  students: { id: string; full_name: string; enrollment_number: string }[];
  existing: Record<string, AttendanceStatus>;
}) {
  const [state, formAction] = useActionState(markAttendanceAction, initialState);
  const { dict } = useLocale();

  const statusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: "present", label: dict.attendance.present },
    { value: "absent", label: dict.attendance.absent },
    { value: "late", label: dict.attendance.late },
    { value: "excused", label: dict.attendance.excused },
  ];

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="date" value={date} />

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-navy-800 dark:border-navy-800">
        {students.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{s.full_name}</p>
              <p className="text-xs text-slate-400 dark:text-navy-500">{s.enrollment_number}</p>
            </div>
            <select
              name={`status_${s.id}`}
              defaultValue={existing[s.id] ?? "present"}
              className="input w-auto bg-white py-1.5 text-sm dark:bg-navy-900"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <SubmitButton />
    </form>
  );
}
