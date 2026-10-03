"use client";

import { useTransition } from "react";
import { removeSubjectTeacherAction } from "../actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function RemoveAssignmentButton({ id, classId }: { id: string; classId: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(dict.adminClasses.confirmRemoveAssignment)) startTransition(() => removeSubjectTeacherAction(id, classId));
      }}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {dict.adminClasses.removeAssignment}
    </button>
  );
}
