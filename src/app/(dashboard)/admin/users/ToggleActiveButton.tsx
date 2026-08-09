"use client";

import { useTransition } from "react";
import { setUserActiveAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ToggleActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setUserActiveAction(userId, !isActive))}
      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-gold-300 dark:hover:text-gold-200 disabled:opacity-50"
    >
      {isActive ? dict.deletion.deactivate : dict.deletion.activate}
    </button>
  );
}
