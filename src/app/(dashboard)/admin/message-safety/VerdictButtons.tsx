"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { setFlagVerdictAction } from "./actions";

export function VerdictButtons({ id, verdict }: { id: string; verdict: "harmful" | "ok" | null }) {
  const { dict } = useLocale();
  const [pending, startTransition] = useTransition();
  const btn = (v: "harmful" | "ok", label: string) => (
    <button
      type="button"
      disabled={pending}
      aria-pressed={verdict === v}
      onClick={() => startTransition(() => setFlagVerdictAction(id, v))}
      className={cn(
        "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
        verdict === v
          ? v === "harmful"
            ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-200 dark:hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1.5">
      {btn("harmful", verdict === "harmful" ? dict.messageSafety.harmful : dict.messageSafety.markHarmful)}
      {btn("ok", verdict === "ok" ? dict.messageSafety.ok : dict.messageSafety.markOk)}
    </div>
  );
}
