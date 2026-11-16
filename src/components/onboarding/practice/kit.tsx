"use client";

/**
 * Practice kit: shared pieces for lesson authors. A practice screen is a
 * self-contained client component that LOOKS like the real page (same ui
 * primitives, tokens and spacing) but runs on made-up data and never reaches
 * the server. See ../lessons/README.md for the rules.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Info, NotebookPen, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import type { OnboardingLocale } from "@/lib/onboarding/types";

const PRACTICE_LABEL: Record<OnboardingLocale, string> = {
  en: "Practice: nothing here is real or saved",
  ar: "تدريب: لا شيء هنا حقيقي أو محفوظ",
};

/**
 * The clearly labelled surface every practice screen sits in. Pass the
 * lesson's `locale` and `dir` (from PracticeProps). `title` is the page title
 * of the real screen it imitates.
 */
export function PracticeFrame({
  locale,
  dir,
  title,
  description,
  action,
  children,
  className,
}: {
  locale: OnboardingLocale;
  dir: "ltr" | "rtl";
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      dir={dir}
      lang={locale}
      aria-label={PRACTICE_LABEL[locale]}
      className={cn(
        "overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-navy-700 dark:bg-navy-950",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-dashed border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200">
        <NotebookPen className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span>{PRACTICE_LABEL[locale]}</span>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        {(title || action) && (
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              {title && <h3 className="page-title-compact">{title}</h3>}
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Made-up people. Obviously fictional; never real names from the database.    */
/* -------------------------------------------------------------------------- */

export interface FakeEntity {
  id: string;
  en: string;
  ar: string;
}

const students: FakeEntity[] = [
  { id: "s1", en: "Omar Sample", ar: "عمر نموذج" },
  { id: "s2", en: "Lina Sample", ar: "لينا نموذج" },
  { id: "s3", en: "Yusuf Example", ar: "يوسف مثال" },
  { id: "s4", en: "Maya Example", ar: "مايا مثال" },
  { id: "s5", en: "Zain Practice", ar: "زين تدريب" },
  { id: "s6", en: "Nour Practice", ar: "نور تدريب" },
];

const parents: FakeEntity[] = [
  { id: "p1", en: "Mr. Sample (Omar's father)", ar: "السيد نموذج (والد عمر)" },
  { id: "p2", en: "Mrs. Sample (Lina's mother)", ar: "السيدة نموذج (والدة لينا)" },
  { id: "p3", en: "Mrs. Example (Yusuf's mother)", ar: "السيدة مثال (والدة يوسف)" },
  { id: "p4", en: "Mr. Practice (Zain's father)", ar: "السيد تدريب (والد زين)" },
];

const teachers: FakeEntity[] = [
  { id: "t1", en: "Ms. Teacher One", ar: "الأستاذة معلمة أولى" },
  { id: "t2", en: "Mr. Teacher Two", ar: "الأستاذ معلم ثانٍ" },
  { id: "t3", en: "Ms. Teacher Three", ar: "الأستاذة معلمة ثالثة" },
];

const classes: FakeEntity[] = [
  { id: "c1", en: "Practice Class 7A", ar: "صف التدريب 7أ" },
  { id: "c2", en: "Practice Class 8B", ar: "صف التدريب 8ب" },
];

const subjects: FakeEntity[] = [
  { id: "m1", en: "Mathematics", ar: "الرياضيات" },
  { id: "m2", en: "Science", ar: "العلوم" },
  { id: "m3", en: "English", ar: "اللغة الإنجليزية" },
  { id: "m4", en: "Arabic", ar: "اللغة العربية" },
];

/** A small bilingual roster of made-up people, classes and subjects. */
export const FakePeople = {
  students,
  parents,
  teachers,
  classes,
  subjects,
  /** Which fake parent belongs to which fake student. */
  parentOf: { s1: "p1", s2: "p2", s3: "p3", s5: "p4" } as Record<string, string | undefined>,
  /** The name of any fake entity in the given language. */
  name(entity: FakeEntity, locale: OnboardingLocale): string {
    return entity[locale];
  },
};

/* -------------------------------------------------------------------------- */
/* Fake toast                                                                  */
/* -------------------------------------------------------------------------- */

type ToastTone = "success" | "error" | "info";

const toastStyle: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  info: "border-navy-200 bg-navy-50 text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100",
};

/**
 * A pretend "saved" / "error" message. Render `toast` once near the top of
 * your screen (it is an always-present live region) and call `show(text)`.
 */
export function useFakeToast(durationMs = 4000) {
  const [message, setMessage] = useState<{ text: string; tone: ToastTone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, tone: ToastTone = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setMessage({ text, tone });
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const Icon = message?.tone === "error" ? XCircle : message?.tone === "info" ? Info : CheckCircle2;
  const toast = (
    <div role="status" aria-live="polite" className="min-h-0">
      {message && (
        <div className={cn("flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm", toastStyle[message.tone])}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );

  return { toast, show };
}

/* -------------------------------------------------------------------------- */
/* Fake table and form helpers                                                 */
/* -------------------------------------------------------------------------- */

/** A table of already-rendered cells, using the app's real Table primitives. */
export function FakeTable({ head, rows }: { head: ReactNode[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <Table>
      <Thead>
        <tr>
          {head.map((h, i) => (
            <Th key={i}>{h}</Th>
          ))}
        </tr>
      </Thead>
      <Tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            {row.cells.map((cell, i) => (
              <Td key={i}>{cell}</Td>
            ))}
          </tr>
        ))}
      </Tbody>
    </Table>
  );
}

/**
 * A form that never submits anywhere: it calls `onSubmit` with the entered
 * values and stays on the page. Use the app's ui `Input` / `Select` inside,
 * with names prefixed "practice-" so ids can't clash with the real page.
 */
export function FakeForm({
  onSubmit,
  submitLabel,
  children,
  className,
}: {
  onSubmit: (values: Record<string, string>) => void;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((v, k) => {
      if (typeof v === "string") values[k] = v;
    });
    onSubmit(values);
  }
  return (
    <form onSubmit={handle} className={cn("space-y-4", className)} noValidate>
      {children}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
