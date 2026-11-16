"use client";

/**
 * Helpers shared by the student and parent practice screens: the little
 * "Next step" guide for new users, a tappable list row, a leave-request form
 * with the real validation messages, and a made-up ID card.
 * Everything here is local state only. Nothing is saved or sent anywhere.
 */

import { useState, type ReactNode } from "react";
import { ChevronRight, Info, User } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import { FakeForm } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { Level, OnboardingLocale } from "@/lib/onboarding/types";

export type Loc = OnboardingLocale;

/** Pick the English or Arabic version of a value. */
export function tr<T>(locale: Loc, en: T, ar: T): T {
  return locale === "ar" ? ar : en;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A local calendar date as YYYY-MM-DD, `offsetDays` from today. */
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* -------------------------------------------------------------------------- */
/* Guide: a little extra help for people who asked for it                      */
/* -------------------------------------------------------------------------- */

export function Guide({
  level,
  locale,
  completed,
  steps,
}: {
  level: Level;
  locale: Loc;
  completed: ReadonlySet<string>;
  steps: { id: string; text: string }[];
}) {
  if (level !== "new") return null;
  const next = steps.find((s) => !completed.has(s.id));
  if (!next) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3 text-sm text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <p>
        <span className="font-medium">{tr(locale, "Next step:", "الخطوة التالية:")}</span> {next.text}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tappable rows and tiles                                                     */
/* -------------------------------------------------------------------------- */

const rowFocus =
  "transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-500 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]";

/** A list row that behaves like the real page's link row, but only reports the tap. */
export function PickRow({
  onPick,
  leading,
  title,
  subtitle,
  trailing,
  chevron = true,
  selected,
}: {
  onPick: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected === undefined ? undefined : selected}
        className={cn("flex min-h-14 w-full items-center gap-4 px-5 py-3 text-start", rowFocus, selected && "bg-slate-50 dark:bg-white/[0.04]")}
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900 dark:text-white">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-slate-500 dark:text-navy-400">{subtitle}</span>}
        </span>
        {trailing}
        {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180 dark:text-navy-600" aria-hidden="true" />}
      </button>
    </li>
  );
}

/** A figure tile (like the real StatCard) that can be pressed. */
export function TileButton({
  label,
  value,
  onPress,
  pressed,
  className,
}: {
  label: string;
  value: ReactNode;
  onPress: () => void;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={pressed}
      className={cn(
        "card flex h-full w-full flex-col p-5 text-start transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:hover:border-navy-600",
        pressed && "ring-2 ring-navy-600 dark:ring-navy-300",
        className,
      )}
    >
      <span className="eyebrow">{label}</span>
      <span className="tabular mt-3 font-display text-[2rem] font-semibold leading-none text-navy-950 dark:text-white">{value}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Leave request: the real form, the real checks, nothing saved                */
/* -------------------------------------------------------------------------- */

export interface LeaveRow {
  id: number;
  start: string;
  end: string;
  reason: string;
}

export type LeaveError = "reason" | "startRequired" | "startOld" | "endRequired" | "endFar" | "endBeforeStart";

const LEAVE_MESSAGES: Record<LeaveError, { en: string; ar: string }> = {
  reason: { en: "Please give a short reason.", ar: "يرجى كتابة سبب قصير." },
  startRequired: { en: "Start date is required.", ar: "تاريخ البدء مطلوب." },
  startOld: { en: "The start date can't be more than two weeks ago.", ar: "لا يمكن أن يكون تاريخ البدء قبل أكثر من أسبوعين." },
  endRequired: { en: "End date is required.", ar: "تاريخ الانتهاء مطلوب." },
  endFar: { en: "The end date is too far in the future.", ar: "تاريخ الانتهاء بعيد جدًا في المستقبل." },
  endBeforeStart: { en: "End date must be on or after the start date.", ar: "يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده." },
};

/** The same order of checks as the real form: reason, start date, end date, then end vs start. */
export function checkLeave(v: { start: string; end: string; reason: string }): LeaveError | null {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (v.reason.trim().length < 3) return "reason";
  if (!date.test(v.start)) return "startRequired";
  if (v.start < isoDate(-14)) return "startOld";
  if (!date.test(v.end)) return "endRequired";
  if (v.end > isoDate(366)) return "endFar";
  if (v.end < v.start) return "endBeforeStart";
  return null;
}

const LEAVE_LABELS = {
  start: { en: "Start Date", ar: "تاريخ البدء" },
  end: { en: "End Date", ar: "تاريخ الانتهاء" },
  reason: { en: "Reason", ar: "السبب" },
  submit: { en: "Submit", ar: "إرسال" },
  saved: { en: "Saved ✓", ar: "تم الحفظ ✓" },
  status: { en: "Status", ar: "الحالة" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  none: { en: "No leave requests yet.", ar: "لا توجد طلبات إجازة بعد." },
};

/**
 * The leave form. `onResult` is called with the error key (or null when the
 * request is fine) and the values, so the lesson can tick its own tasks.
 */
export function LeaveForm({
  locale,
  idPrefix = "practice-leave",
  onResult,
}: {
  locale: Loc;
  idPrefix?: string;
  onResult: (error: LeaveError | null, values: { start: string; end: string; reason: string }) => void;
}) {
  const [error, setError] = useState<LeaveError | null>(null);
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <FakeForm
      key={formKey}
      submitLabel={LEAVE_LABELS.submit[locale]}
      onSubmit={(values) => {
        const v = { start: values[`${idPrefix}-start`] ?? "", end: values[`${idPrefix}-end`] ?? "", reason: values[`${idPrefix}-reason`] ?? "" };
        const result = checkLeave(v);
        setError(result);
        setSaved(result === null);
        if (result === null) setFormKey((k) => k + 1);
        onResult(result, v);
      }}
    >
      {error && <Alert tone="error">{LEAVE_MESSAGES[error][locale]}</Alert>}
      {saved && !error && <Alert tone="success">{LEAVE_LABELS.saved[locale]}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={LEAVE_LABELS.start[locale]} name={`${idPrefix}-start`} type="date" />
        <Input label={LEAVE_LABELS.end[locale]} name={`${idPrefix}-end`} type="date" />
      </div>
      <Textarea label={LEAVE_LABELS.reason[locale]} name={`${idPrefix}-reason`} rows={3} />
    </FakeForm>
  );
}

/** The list of leave requests under the form: a table from sm up, stacked rows on a phone. */
export function LeaveList({ locale, rows }: { locale: Loc; rows: LeaveRow[] }) {
  if (rows.length === 0) {
    return <p className="card px-5 py-6 text-sm text-slate-500 dark:text-navy-400">{LEAVE_LABELS.none[locale]}</p>;
  }
  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <Thead>
            <tr>
              <Th>{LEAVE_LABELS.start[locale]}</Th>
              <Th>{LEAVE_LABELS.end[locale]}</Th>
              <Th>{LEAVE_LABELS.reason[locale]}</Th>
              <Th>{LEAVE_LABELS.status[locale]}</Th>
            </tr>
          </Thead>
          <Tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium text-slate-900 dark:text-white">
                  <bdi dir="ltr">{r.start}</bdi>
                </Td>
                <Td>
                  <bdi dir="ltr">{r.end}</bdi>
                </Td>
                <Td>{r.reason}</Td>
                <Td>
                  <Badge tone="amber">{LEAVE_LABELS.pending[locale]}</Badge>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </div>
      <ul className="card divide-y divide-slate-100 sm:hidden dark:divide-navy-800">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="tabular text-sm font-medium text-slate-900 dark:text-white">
                <bdi dir="ltr">
                  {r.start} – {r.end}
                </bdi>
              </p>
              <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-navy-400">{r.reason}</p>
            </div>
            <Badge tone="amber">{LEAVE_LABELS.pending[locale]}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* A made-up ID card (navy and gold, like the real one)                        */
/* -------------------------------------------------------------------------- */

export function FakeIdCard({
  locale,
  name,
  className,
  studentNumber,
  birth,
  year,
  hasPhoto,
}: {
  locale: Loc;
  name: string;
  className: string;
  studentNumber: string;
  birth: string;
  year: string;
  hasPhoto: boolean;
}) {
  const initialsOf = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const fields: [string, string][] = [
    [tr(locale, "Grade / Class", "الصف / الفصل"), className],
    [tr(locale, "Student ID", "رقم الطالب"), studentNumber],
    [tr(locale, "Date of Birth", "تاريخ الميلاد"), birth],
    [tr(locale, "Academic Year", "العام الدراسي"), year],
  ];
  return (
    <div className="w-full max-w-[480px]" style={{ containerType: "inline-size" }}>
      <div
        dir="ltr"
        role="img"
        aria-label={`${tr(locale, "Student ID Card", "بطاقة هوية الطالب")}: ${name}`}
        className="relative aspect-[1011/638] w-full overflow-hidden rounded-[4%/6%] bg-navy-900 text-white shadow-card"
      >
        <div className="flex h-[26%] items-center gap-[3cqw] border-b-[0.8cqw] border-gold-500 bg-navy-950 px-[5cqw]">
          <span className="flex h-[10cqw] w-[10cqw] items-center justify-center rounded-full border border-gold-500 text-[4cqw] font-semibold text-gold-300">S</span>
          <span className="min-w-0">
            <span className="block truncate text-[4.2cqw] font-semibold leading-tight">Sample School</span>
            <span className="block truncate text-[2.6cqw] font-medium tracking-wide text-gold-300">
              {tr(locale, "STUDENT ID CARD", "بطاقة هوية الطالب")}
            </span>
          </span>
        </div>
        <div className="flex gap-[5cqw] px-[5cqw] pt-[4cqw]">
          <span className="flex h-[26cqw] w-[26cqw] shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.8cqw] border-gold-500 bg-navy-700">
            {hasPhoto ? (
              <span className="flex h-full w-full items-center justify-center bg-navy-300 text-[8cqw] font-semibold text-navy-950">{initialsOf}</span>
            ) : (
              <User className="h-[16cqw] w-[16cqw] text-navy-300" strokeWidth={1.5} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[5cqw] font-semibold leading-tight">{name}</span>
            <dl className="mt-[1.6cqw] space-y-[0.9cqw]">
              {fields.map(([k, v]) => (
                <div key={k} className="flex gap-[2cqw] text-[2.8cqw] leading-tight">
                  <dt className="w-[18cqw] shrink-0 text-navy-200">{k}</dt>
                  <dd className="min-w-0 truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3%] bg-gold-500" />
      </div>
    </div>
  );
}
