"use client";

import { useTransition } from "react";
import { deleteTimetableEntryAction } from "@/lib/timetable/builderActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Shared by /admin/timetable and /teacher/timetable-builder — see builderActions.ts's doc comment. */
export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(dict.adminTimetable.confirmRemovePeriod)) startTransition(() => deleteTimetableEntryAction(id));
      }}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {dict.adminTimetable.removePeriod}
    </button>
  );
}
