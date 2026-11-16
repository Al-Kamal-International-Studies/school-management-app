"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Info } from "lucide-react";
import { FieldWrapper } from "@/components/ui/Field";
import { FakeTable } from "@/components/onboarding/practice/kit";
import type { Level, OnboardingLocale } from "@/lib/onboarding/types";

/** A made-up admin, used as the "actor" in practice screens. */
export const FAKE_ADMIN = { en: "Ms. Admin Sample", ar: "الأستاذة مديرة نموذج" };

/** A plain native select styled like the app's inputs (a dropdown panel would be clipped by the practice frame). */
export function NativeSelect({
  label,
  name,
  value,
  onChange,
  options,
  hint,
  error,
  required,
  multiple,
}: {
  label: string;
  name: string;
  value: string | string[];
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  required?: boolean;
  multiple?: boolean;
}) {
  return (
    <FieldWrapper label={label} htmlFor={name} hint={hint} error={error}>
      <select id={name} name={name} value={value} onChange={onChange} required={required} multiple={multiple} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

/** Extra inline guidance, shown only to people who said they are new. */
export function Guidance({ level, children }: { level: Level; children: ReactNode }) {
  if (level !== "new") return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5 text-sm text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** A quiet explanatory note that everyone sees. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-slate-600 dark:text-navy-200">{children}</p>;
}

/**
 * A table on wide screens, stacked cards under 640 px. A column with an empty
 * heading is treated as the row's actions.
 */
export function ResponsiveTable({ head, rows }: { head: string[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <>
      <div className="hidden sm:block">
        <FakeTable head={head} rows={rows} />
      </div>
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <li key={row.key} className="card space-y-2 p-4">
            {row.cells.map((cell, i) =>
              head[i] ? (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-navy-300">{head[i]}</span>
                  <span className="min-w-0 text-end text-slate-800 dark:text-navy-100">{cell}</span>
                </div>
              ) : (
                <div key={i} className="flex flex-wrap items-center gap-2 pt-1">
                  {cell}
                </div>
              ),
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function pick<T>(locale: OnboardingLocale, en: T, ar: T): T {
  return locale === "ar" ? ar : en;
}

/** A small text-style button used for row actions (looks like the real inline links). */
export function LinkButton({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-md px-1 py-1 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-50 " +
        (danger ? "text-red-700 dark:text-red-300" : "text-navy-600 dark:text-navy-200")
      }
    >
      {children}
    </button>
  );
}

/** Array access that is safe under noUncheckedIndexedAccess (practice data is fixed, so a miss is a bug). */
export function at<T>(list: readonly T[], i: number): T {
  const v = list[i];
  if (v === undefined) throw new Error(`practice data index out of range: ${i}`);
  return v;
}
