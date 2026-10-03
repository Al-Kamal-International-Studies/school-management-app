"use client";

import { useTransition } from "react";
import { deleteSubjectAction } from "./actions";

export function DeleteSubjectButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this subject? A subject that is still used by any class, timetable, assignment, exam or grade can't be removed.")) {
          startTransition(async () => {
            const result = await deleteSubjectAction(id);
            if (result?.error) alert(result.error);
          });
        }
      }}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
