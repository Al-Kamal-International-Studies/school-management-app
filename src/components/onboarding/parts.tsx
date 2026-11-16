"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One large tappable answer. A real radio / checkbox input sits inside (kept
 * visually hidden but focusable), so the browser provides the semantics,
 * arrow-key movement inside a radio group, and Space to toggle.
 */
export function OptionCard({
  type,
  name,
  value,
  checked,
  disabled,
  onChange,
  label,
  description,
  lang,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: ReactNode;
  description?: ReactNode;
  lang?: string;
  children?: ReactNode;
}) {
  return (
    <label className={cn("block", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span
        className={cn(
          "group relative flex min-h-[4.5rem] items-start gap-3 rounded-xl border bg-white p-4 transition-colors duration-150 dark:bg-navy-900",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-50 dark:has-[:focus-visible]:ring-navy-300 dark:has-[:focus-visible]:ring-offset-navy-950",
          checked
            ? "border-navy-900 shadow-[inset_0_0_0_1px_rgb(var(--color-navy-900))] dark:border-navy-200 dark:shadow-[inset_0_0_0_1px_rgb(var(--color-navy-200))]"
            : "border-slate-200 hover:border-slate-300 dark:border-navy-700 dark:hover:border-navy-500",
          disabled && "opacity-50",
        )}
      >
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border",
            type === "radio" ? "rounded-full" : "rounded-md",
            checked
              ? "border-navy-900 bg-navy-900 text-white dark:border-navy-100 dark:bg-navy-100 dark:text-navy-950"
              : "border-slate-300 bg-white dark:border-navy-600 dark:bg-navy-900",
          )}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1" lang={lang}>
          <span className="block text-[0.9375rem] font-semibold leading-6 text-slate-900 dark:text-white">{label}</span>
          {description && <span className="mt-0.5 block text-sm text-slate-500 dark:text-navy-300">{description}</span>}
          {children}
        </span>
      </span>
    </label>
  );
}

/** The h1 of a screen plus an optional grey line under it. */
export function ScreenTitle({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="max-w-2xl">
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h1 id={id} className="page-title">
        {title}
      </h1>
      {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-300">{description}</p>}
    </header>
  );
}

const chipTone = {
  navy: "bg-navy-50 text-navy-800 ring-navy-600/20 dark:bg-navy-500/15 dark:text-navy-100 dark:ring-navy-300/25",
  slate: "bg-slate-50 text-slate-700 ring-slate-500/20 dark:bg-white/5 dark:text-navy-200 dark:ring-white/10",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
} as const;

/**
 * Same look as ui/Badge but without its `capitalize`, which would turn
 * lesson-authored role names ("other students") into Title Case.
 */
export function Chip({ tone = "slate", children }: { tone?: keyof typeof chipTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset", chipTone[tone])}>
      {children}
    </span>
  );
}
