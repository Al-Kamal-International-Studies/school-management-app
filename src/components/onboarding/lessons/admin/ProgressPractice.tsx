"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, NativeSelect, Note, ResponsiveTable } from "./common";

const T = {
  en: {
    title: "Progress",
    subtitle: "All monthly progress entries submitted by teachers, school-wide.",
    student: "Student",
    class: "Class",
    month: "Month",
    all: "All",
    submit: "Submit",
    export: "Export",
    exported: "Practice: a real CSV file of the rows below would download now.",
    head: ["Student", "Class", "Subject", "Teacher", "Month", "Overall score"],
    none: "No progress entries yet.",
    scoreNote: "The overall score is the average of six factors the teacher rates: attendance, homework completion, class participation, behaviour and conduct, assessment performance, and subject understanding. This page is read-only.",
    guide: "Choose a class (for example the first one), then press Submit. Then press Export.",
    months: { "2026-10": "October 2026", "2026-09": "September 2026" } as Record<string, string>,
  },
  ar: {
    title: "التقدم",
    subtitle: "جميع إدخالات التقدم الشهرية التي رفعها المعلمون على مستوى المدرسة.",
    student: "الطالب",
    class: "الفصل",
    month: "الشهر",
    all: "الكل",
    submit: "إرسال",
    export: "تصدير",
    exported: "تدريب: في الواقع سيتم الآن تنزيل ملف CSV بالصفوف أدناه.",
    head: ["الطالب", "الفصل", "المادة", "المعلم", "الشهر", "الدرجة الإجمالية"],
    none: "لا توجد إدخالات تقدم بعد.",
    scoreNote: "الدرجة الإجمالية هي متوسط ستة عوامل يقيّمها المعلم: الحضور، وإنجاز الواجبات، والمشاركة الصفية، والسلوك والانضباط، والأداء في التقييمات، وفهم المادة. هذه الصفحة للقراءة فقط.",
    guide: "اختر فصلًا (مثل الأول) ثم اضغط «إرسال». بعدها اضغط «تصدير».",
    months: { "2026-10": "أكتوبر 2026", "2026-09": "سبتمبر 2026" } as Record<string, string>,
  },
};

const DATA = [
  { s: "s1", c: "c1", sub: "m1", t: "t1", m: "2026-10", score: 82 },
  { s: "s2", c: "c1", sub: "m2", t: "t3", m: "2026-10", score: 78 },
  { s: "s3", c: "c1", sub: "m3", t: "t2", m: "2026-09", score: 71 },
  { s: "s4", c: "c2", sub: "m1", t: "t1", m: "2026-10", score: 88 },
  { s: "s5", c: "c2", sub: "m4", t: "t2", m: "2026-10", score: 90 },
  { s: "s6", c: "c2", sub: "m1", t: "t1", m: "2026-09", score: 65 },
];

export default function ProgressPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [draft, setDraft] = useState({ s: "", c: "", m: "" });
  const [applied, setApplied] = useState({ s: "", c: "", m: "" });
  const { toast, show } = useFakeToast();

  const name = (list: { id: string; en: string; ar: string }[], id: string) => list.find((x) => x.id === id)?.[locale] ?? "";
  const rows = DATA.filter((r) => (!applied.s || r.s === applied.s) && (!applied.c || r.c === applied.c) && (!applied.m || r.m === applied.m));

  function apply(e: FormEvent) {
    e.preventDefault();
    setApplied(draft);
    if (draft.c) completeTask("apply-filter");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      {toast}
      <form onSubmit={apply} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
        <NativeSelect
          label={t.student}
          name="practice-pg-student"
          value={draft.s}
          onChange={(e) => setDraft((d) => ({ ...d, s: e.target.value }))}
          options={[{ value: "", label: t.all }, ...FakePeople.students.map((s) => ({ value: s.id, label: s[locale] }))]}
        />
        <NativeSelect
          label={t.class}
          name="practice-pg-class"
          value={draft.c}
          onChange={(e) => setDraft((d) => ({ ...d, c: e.target.value }))}
          options={[{ value: "", label: t.all }, ...FakePeople.classes.map((c) => ({ value: c.id, label: c[locale] }))]}
        />
        <NativeSelect
          label={t.month}
          name="practice-pg-month"
          value={draft.m}
          onChange={(e) => setDraft((d) => ({ ...d, m: e.target.value }))}
          options={[{ value: "", label: t.all }, ...Object.entries(t.months).map(([v, l]) => ({ value: v, label: l }))]}
        />
        <Button type="submit">{t.submit}</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            show(t.exported, "info");
            completeTask("export-csv");
          }}
        >
          {t.export}
        </Button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
      ) : (
        <ResponsiveTable
          head={t.head}
          rows={rows.map((r) => ({
            key: `${r.s}-${r.m}`,
            cells: [
              <span key="s" className="font-medium text-slate-900 dark:text-white">
                {name(FakePeople.students, r.s)}
              </span>,
              name(FakePeople.classes, r.c),
              name(FakePeople.subjects, r.sub),
              name(FakePeople.teachers, r.t),
              t.months[r.m],
              <span key="o" className="tabular font-semibold">
                {r.score}
              </span>,
            ],
          }))}
        />
      )}
      <Note>{t.scoreNote}</Note>
    </PracticeFrame>
  );
}
