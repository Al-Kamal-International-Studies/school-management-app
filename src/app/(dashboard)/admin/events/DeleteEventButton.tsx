"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteEventAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DeleteEventButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(dict.calendar.deleteConfirm)) startTransition(() => deleteEventAction(id));
      }}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-navy-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      aria-label={dict.common.delete}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
