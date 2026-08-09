"use client";

import { useTransition } from "react";
import { removeSubjectTeacherAction } from "../actions";

export function RemoveAssignmentButton({ id, classId }: { id: string; classId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeSubjectTeacherAction(id, classId))}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
