"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { dismissPasswordResetRequestAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DismissButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => dismissPasswordResetRequestAction(id))}
      className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-navy-400 dark:hover:text-navy-200"
    >
      <span className="flex items-center gap-1">
        <X className="h-3.5 w-3.5" />
        {dict.adminPasswordResetRequests.dismiss}
      </span>
    </button>
  );
}
