/**
 * Small helpers shared by the teacher practice screens (this folder only).
 * Fake data, no server calls.
 */

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { FakePeople, type FakeEntity } from "@/components/onboarding/practice/kit";
import type { Level, OnboardingLocale } from "@/lib/onboarding/types";

export type Loc = OnboardingLocale;

/** Pick the English or Arabic string. */
export function pick<T>(locale: Loc, en: T, ar: T): T {
  return locale === "ar" ? ar : en;
}

/** Today's date (local) plus an offset in days, as YYYY-MM-DD. */
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** This month as YYYY-MM, plus an offset in months. */
export function isoMonth(offsetMonths = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------------------------- made-up people ---------------------------- */

const byId = (list: FakeEntity[]) => (id: string) => list.find((x) => x.id === id)!;
export const studentById = byId(FakePeople.students);
export const classById = byId(FakePeople.classes);
export const subjectById = byId(FakePeople.subjects);
export const teacherById = byId(FakePeople.teachers);

export const nameOf = (e: FakeEntity, locale: Loc) => FakePeople.name(e, locale);

/** Which fake students sit in which fake class. */
export const ROSTER: Record<string, { id: string; enrollment: string }[]> = {
  c1: [
    { id: "s1", enrollment: "AK-0101" },
    { id: "s2", enrollment: "AK-0102" },
    { id: "s3", enrollment: "AK-0103" },
    { id: "s4", enrollment: "AK-0104" },
  ],
  c2: [
    { id: "s5", enrollment: "AK-0205" },
    { id: "s6", enrollment: "AK-0206" },
  ],
};

/** Class and subject pairs the practice teacher "teaches". */
export const TEACHES: { classId: string; subjectId: string }[] = [
  { classId: "c1", subjectId: "m1" },
  { classId: "c1", subjectId: "m2" },
  { classId: "c2", subjectId: "m1" },
];

export const pairKey = (p: { classId: string; subjectId: string }) => `${p.classId}:${p.subjectId}`;

export function pairLabel(p: { classId: string; subjectId: string }, locale: Loc): string {
  return `${nameOf(classById(p.classId), locale)} — ${nameOf(subjectById(p.subjectId), locale)}`;
}

/** Student, subject and class triples (the Grades and Progress selects). */
export const STUDENT_TARGETS: { studentId: string; subjectId: string; classId: string }[] = TEACHES.flatMap((p) =>
  (ROSTER[p.classId] ?? []).map((s) => ({ studentId: s.id, subjectId: p.subjectId, classId: p.classId })),
);

export const targetKey = (t: { studentId: string; subjectId: string; classId: string }) =>
  `${t.studentId}:${t.subjectId}:${t.classId}`;

export function targetLabel(t: { studentId: string; subjectId: string; classId: string }, locale: Loc): string {
  return `${nameOf(studentById(t.studentId), locale)} — ${nameOf(subjectById(t.subjectId), locale)} (${nameOf(classById(t.classId), locale)})`;
}

/* ------------------------------ small pieces ----------------------------- */

/** Extra inline guidance, shown only to people who asked for extra help. */
export function Guide({ level, children }: { level: Level; children: ReactNode }) {
  if (level !== "new") return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-600 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-navy-400" strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** "Save ✓", the real success text. */
export const SAVE_OK: Record<Loc, string> = { en: "Save ✓", ar: "حفظ ✓" };

export const COMMON = {
  submit: { en: "Submit", ar: "إرسال" },
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  continue: { en: "Continue", ar: "متابعة" },
  class: { en: "Class", ar: "الفصل" },
  subject: { en: "Subject", ar: "المادة" },
  student: { en: "Student", ar: "الطالب" },
  date: { en: "Date", ar: "التاريخ" },
  status: { en: "Status", ar: "الحالة" },
  title: { en: "Title", ar: "العنوان" },
  room: { en: "Room", ar: "القاعة" },
  students: { en: "Students", ar: "الطلاب" },
  term: { en: "Term", ar: "الفصل الدراسي" },
} as const;

export const t = (locale: Loc, pair: { en: string; ar: string }) => pair[locale];

export const DAY_NAMES: Record<Loc, string[]> = {
  en: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ar: ["", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
};

/** Input names become DOM ids, so every practice field is prefixed. */
export const FIELD_ID = (screen: string, field: string) => `practice-${screen}-${field}`;
