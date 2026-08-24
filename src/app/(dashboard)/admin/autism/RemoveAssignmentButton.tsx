"use client";

import { useTransition } from "react";
import { removeAutismAssignmentAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function RemoveAssignmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(dict.autismSection.removeConfirm)) startTransition(() => removeAutismAssignmentAction(id));
      }}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {dict.autismSection.remove}
    </button>
  );
}
