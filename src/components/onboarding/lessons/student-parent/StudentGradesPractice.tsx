"use client";

import { FakePeople, FakeTable, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, tr } from "./shared";

const GRADES = [
  { id: "g1", subject: 0, assessment: { en: "Midterm", ar: "اختبار منتصف الفصل" }, got: 18, total: 20 },
  { id: "g2", subject: 0, assessment: { en: "Quiz 1", ar: "مذاكرة 1" }, got: 7, total: 10 },
  { id: "g3", subject: 1, assessment: { en: "Lab report", ar: "تقرير المختبر" }, got: 15, total: 20 },
  { id: "g4", subject: 1, assessment: { en: "Unit test", ar: "اختبار الوحدة" }, got: 17, total: 25 },
  { id: "g5", subject: 2, assessment: { en: "Essay", ar: "مقال" }, got: 12, total: 20 },
  { id: "g6", subject: 3, assessment: { en: "Dictation", ar: "إملاء" }, got: 9, total: 10 },
];

const percent = (g: { got: number; total: number }) => Math.round((g.got / g.total) * 100);
const LOWEST = GRADES.reduce((a, b) => (percent(b) < percent(a) ? b : a)).id;

export default function StudentGradesPractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(8000);
  const term = tr(locale, "Term 1", "الفصل الأول");

  const rows = GRADES.map((g) => ({ ...g, subjectName: FakePeople.name(FakePeople.subjects[g.subject]!, locale), name: g.assessment[locale] }));

  function pick(g: (typeof rows)[number]) {
    const detail = tr(
      locale,
      `${g.subjectName}, ${g.name}: ${g.got} out of ${g.total} = ${percent(g)}%.`,
      `${g.subjectName}، ${g.name}: ${g.got} من ${g.total} = ${percent(g)}%.`,
    );
    if (g.id === "g1") completeTask("maths");
    if (g.id === LOWEST) completeTask("lowest");
    if (g.id === "g1" || g.id === LOWEST) {
      show(`${tr(locale, "Yes.", "صحيح.")} ${detail}`);
    } else {
      show(detail, "info");
    }
  }

  const subjectButton = (g: (typeof rows)[number]) => (
    <button
      type="button"
      onClick={() => pick(g)}
      className="-mx-1 rounded px-1 text-start font-medium text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-white"
    >
      {g.subjectName}
    </button>
  );

  return (
    <PracticeFrame locale={locale} dir={dir} title={tr(locale, "Grades", "الدرجات")}>
      {toast}
      <p className="text-xs text-slate-500 dark:text-navy-400">
        {tr(
          locale,
          "Only you, your parents and the school can see these marks. Other students cannot.",
          "أنت وولي أمرك والمدرسة فقط يمكنكم رؤية هذه الدرجات. أما الطلاب الآخرون فلا يرونها.",
        )}
      </p>
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "maths", text: tr(locale, "Press Mathematics in the row that says Midterm.", "اضغط «الرياضيات» في الصف المكتوب فيه «اختبار منتصف الفصل».") },
          {
            id: "lowest",
            text: tr(
              locale,
              "Press a subject to see its percentage. The lowest percentage is your lowest mark.",
              "اضغط على مادة لترى نسبتها المئوية. أدنى نسبة هي أدنى درجة لك.",
            ),
          },
        ]}
      />

      <div className="hidden sm:block">
        <FakeTable
          head={[
            tr(locale, "Subject", "المادة"),
            tr(locale, "Assessment", "التقييم"),
            `${tr(locale, "Marks Obtained", "الدرجة المحصلة")}/${tr(locale, "Marks Total", "الدرجة الكلية")}`,
            tr(locale, "Term", "الفصل الدراسي"),
          ]}
          rows={rows.map((g) => ({
            key: g.id,
            cells: [
              subjectButton(g),
              g.name,
              <bdi key="m" dir="ltr">
                {g.got}/{g.total}
              </bdi>,
              term,
            ],
          }))}
        />
      </div>

      <ul className="card divide-y divide-slate-100 sm:hidden dark:divide-navy-800">
        {rows.map((g) => (
          <li key={g.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-sm">
              {subjectButton(g)}
              <p className="text-xs text-slate-500 dark:text-navy-400">
                {g.name} · {term}
              </p>
            </div>
            <span className="tabular shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
              <bdi dir="ltr">
                {g.got}/{g.total}
              </bdi>
            </span>
          </li>
        ))}
      </ul>
    </PracticeFrame>
  );
}
