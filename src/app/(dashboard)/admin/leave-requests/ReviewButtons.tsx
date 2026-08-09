"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { reviewLeaveRequestAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ReviewButtons({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => reviewLeaveRequestAction(id, "approved"))}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
      >
        <Check className="h-3.5 w-3.5" /> {dict.leave.approve}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => reviewLeaveRequestAction(id, "rejected"))}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
      >
        <X className="h-3.5 w-3.5" /> {dict.leave.reject}
      </button>
    </div>
  );
}
