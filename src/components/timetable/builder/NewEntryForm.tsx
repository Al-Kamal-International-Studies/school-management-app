"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ActionForm, useFormStatus } from "@/components/ui/ActionForm";
import { saveTimetableEntryAction, type ActionState } from "@/lib/timetable/builderActions";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getDayNames } from "@/lib/utils";

const initialState: ActionState = {};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" disabled={pending}>
      {editing ? (pending ? dict.common.saving : dict.common.saveChanges) : pending ? dict.common.adding : dict.adminTimetable.addPeriod}
    </Button>
  );
}

/** A period being edited (HANDOVER Part 41) — prefills the same form. */
export interface EditingEntry {
  id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

/** Shared by /admin/timetable and /teacher/timetable-builder — see builderActions.ts's doc comment.
 *  With `editing`, the same form edits that period instead of adding one; callers key it by the
 *  entry id so the defaults reset when a different period is picked. */
export function NewEntryForm({
  classId,
  assignableSubjects,
  editing,
  basePath,
}: {
  classId: string;
  assignableSubjects: { subjectId: string; subjectName: string; teacherId: string; teacherName: string }[];
  editing?: EditingEntry;
  basePath: "/admin/timetable" | "/teacher/timetable-builder";
}) {
  const [state, formAction] = useActionState(saveTimetableEntryAction, initialState);
  const { dict } = useLocale();
  const hhmm = (t: string) => t.slice(0, 5);

  return (
    <ActionForm action={formAction} state={state} resetOnSuccess={!editing} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="class_id" value={classId} />
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="return_to" value={basePath} />

      <Select
        label={dict.adminTimetable.subjectTeacherAuto}
        name="subject_teacher"
        required
        defaultValue={editing ? `${editing.subject_id}|${editing.teacher_id}` : ""}
        onChange={(e) => {
          const [subjectId, teacherId] = e.target.value.split("|");
          const form = e.target.form!;
          (form.elements.namedItem("subject_id") as HTMLInputElement).value = subjectId ?? "";
          (form.elements.namedItem("teacher_id") as HTMLInputElement).value = teacherId ?? "";
        }}
      >
        <option value="" disabled>
          {dict.adminTimetable.chooseSubject}
        </option>
        {assignableSubjects.map((a) => (
          <option key={a.subjectId} value={`${a.subjectId}|${a.teacherId}`}>
            {a.subjectName} — {a.teacherName}
          </option>
        ))}
      </Select>
      <input type="hidden" name="subject_id" defaultValue={editing?.subject_id} />
      <input type="hidden" name="teacher_id" defaultValue={editing?.teacher_id} />

      <Select label={dict.adminTimetable.day} name="day_of_week" required defaultValue={String(editing?.day_of_week ?? 1)}>
        {getDayNames(dict).slice(1).map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.adminTimetable.startTime} name="start_time" type="time" required defaultValue={editing ? hhmm(editing.start_time) : undefined} />
        <Input label={dict.adminTimetable.endTime} name="end_time" type="time" required defaultValue={editing ? hhmm(editing.end_time) : undefined} />
      </div>
      <Input label={dict.adminTimetable.roomOptional} name="room" defaultValue={editing?.room ?? undefined} />

      <div className="flex items-center gap-4">
        <SubmitButton editing={!!editing} />
        {editing && (
          <Link href={`${basePath}?class=${classId}`} className="text-sm font-medium text-slate-600 hover:text-navy-900 hover:underline dark:text-navy-300 dark:hover:text-white">
            {dict.common.cancel}
          </Link>
        )}
      </div>
    </ActionForm>
  );
}
