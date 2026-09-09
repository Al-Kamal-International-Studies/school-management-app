"use client";

import { useTransition } from "react";
import { deleteTimetableEntryAction } from "@/lib/timetable/builderActions";

/** Shared by /admin/timetable and /teacher/timetable-builder — see builderActions.ts's doc comment. */
export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteTimetableEntryAction(id))}
      className="mt-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
