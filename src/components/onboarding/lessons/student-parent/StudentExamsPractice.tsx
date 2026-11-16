"use client";

import { Badge } from "@/components/ui/Badge";
import { FakePeople, FakeTable, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, isoDate, tr } from "./shared";

type Kind = "exam" | "quiz";

const EXAMS: { id: string; kind: Kind; subject: number; offset: number; room: { en: string; ar: string } }[] = [
  { id: "e1", kind: "quiz", subject: 1, offset: 4, room: { en: "Lab 2", ar: "المختبر 2" } },
  { id: "e2", kind: "exam", subject: 0, offset: 10, room: { en: "Hall A", ar: "القاعة أ" } },
  { id: "e3", kind: "quiz", subject: 2, offset: 14, room: { en: "5", ar: "5" } },
  { id: "e4", kind: "exam", subject: 3, offset: 20, room: { en: "Hall A", ar: "القاعة أ" } },
];

export default function StudentExamsPractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(8000);

  const titleOf: Record<string, string> = {
    e1: tr(locale, "Science quiz", "مذاكرة العلوم"),
    e2: tr(locale, "Mathematics exam", "اختبار الرياضيات"),
    e3: tr(locale, "English quiz", "مذاكرة اللغة الإنجليزية"),
    e4: tr(locale, "Arabic exam", "اختبار اللغة العربية"),
  };
  const kindLabel: Record<Kind, string> = { exam: tr(locale, "Exam", "اختبار"), quiz: tr(locale, "Quiz", "مذاكرة") };

  const rows = EXAMS.map((e) => ({
    ...e,
    title: titleOf[e.id]!,
    subjectName: FakePeople.name(FakePeople.subjects[e.subject]!, locale),
    date: isoDate(e.offset),
  }));

  function pick(e: (typeof rows)[number]) {
    const detail = tr(
      locale,
      `${e.title}: ${e.date}, room ${e.room.en}.`,
      `${e.title}: ${e.date}، القاعة ${e.room.ar}.`,
    );
    if (e.id === "e1") completeTask("quiz");
    if (e.id === "e2") completeTask("maths-room");
    if (e.id === "e1" || e.id === "e2") {
      show(`${tr(locale, "Yes.", "صحيح.")} ${detail}`);
    } else {
      show(
        `${detail} ${tr(
          locale,
          "This is not the one in the task. Check the Type column and the date.",
          "هذا ليس المطلوب في المهمة. تحقق من عمود النوع ومن التاريخ.",
        )}`,
        "info",
      );
    }
  }

  const titleButton = (e: (typeof rows)[number]) => (
    <button
      type="button"
      onClick={() => pick(e)}
      className="-mx-1 rounded px-1 text-start font-medium text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-white"
    >
      {e.title}
    </button>
  );

  return (
    <PracticeFrame locale={locale} dir={dir} title={tr(locale, "Exams & Quizzes", "الاختبارات والمذاكرات")}>
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "quiz", text: tr(locale, "Find the first row with the Quiz badge and press its title.", "ابحث عن أول صف عليه علامة «مذاكرة» واضغط على عنوانه.") },
          { id: "maths-room", text: tr(locale, "Press the title Mathematics exam.", "اضغط على العنوان «اختبار الرياضيات».") },
        ]}
      />

      <div className="hidden sm:block">
        <FakeTable
          head={[
            tr(locale, "Title", "العنوان"),
            tr(locale, "Subject", "المادة"),
            tr(locale, "Type", "النوع"),
            tr(locale, "Date", "التاريخ"),
            tr(locale, "Room", "القاعة"),
          ]}
          rows={rows.map((e) => ({
            key: e.id,
            cells: [
              titleButton(e),
              e.subjectName,
              <Badge key="k" tone={e.kind === "quiz" ? "gold" : "navy"}>
                {kindLabel[e.kind]}
              </Badge>,
              <bdi key="d" dir="ltr">
                {e.date}
              </bdi>,
              e.room[locale],
            ],
          }))}
        />
      </div>

      <ul className="card divide-y divide-slate-100 sm:hidden dark:divide-navy-800">
        {rows.map((e) => (
          <li key={e.id} className="space-y-1 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">{titleButton(e)}</div>
              <Badge tone={e.kind === "quiz" ? "gold" : "navy"}>{kindLabel[e.kind]}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              {e.subjectName} · <bdi dir="ltr">{e.date}</bdi> · {tr(locale, "Room", "القاعة")} {e.room[locale]}
            </p>
          </li>
        ))}
      </ul>
    </PracticeFrame>
  );
}
