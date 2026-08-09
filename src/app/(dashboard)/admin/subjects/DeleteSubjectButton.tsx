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
        if (confirm("Remove this subject? This also removes any class/teacher assignments for it.")) {
          startTransition(() => deleteSubjectAction(id));
        }
      }}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
