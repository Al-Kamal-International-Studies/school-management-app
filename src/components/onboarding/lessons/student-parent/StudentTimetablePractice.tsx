"use client";

import { useState } from "react";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, tr } from "./shared";

const [maths, science, english, arabic] = FakePeople.subjects as [
  (typeof FakePeople.subjects)[number],
  (typeof FakePeople.subjects)[number],
  (typeof FakePeople.subjects)[number],
  (typeof FakePeople.subjects)[number],
];
const [t1, t2, t3] = FakePeople.teachers as [(typeof FakePeople.teachers)[number], (typeof FakePeople.teachers)[number], (typeof FakePeople.teachers)[number]];

const SLOTS = [
  { start: "08:00", end: "08:45" },
  { start: "09:00", end: "09:45" },
  { start: "10:15", end: "11:00" },
];

type Lesson = { subject: typeof maths; teacher: typeof t1; room: string };

const WEEK: { day: number; en: string; ar: string; lessons: Lesson[] }[] = [
  {
    day: 1,
    en: "Monday",
    ar: "الاثنين",
    lessons: [
      { subject: maths, teacher: t1, room: "12" },
      { subject: english, teacher: t2, room: "5" },
      { subject: science, teacher: t3, room: "Lab 2" },
    ],
  },
  {
    day: 2,
    en: "Tuesday",
    ar: "الثلاثاء",
    lessons: [
      { subject: arabic, teacher: t2, room: "7" },
      { subject: maths, teacher: t1, room: "12" },
      { subject: english, teacher: t2, room: "5" },
    ],
  },
  {
    day: 3,
    en: "Wednesday",
    ar: "الأربعاء",
    lessons: [
      { subject: english, teacher: t2, room: "5" },
      { subject: science, teacher: t3, room: "Lab 2" },
      { subject: arabic, teacher: t2, room: "7" },
    ],
  },
  {
    day: 4,
    en: "Thursday",
    ar: "الخميس",
    lessons: [
      { subject: science, teacher: t3, room: "Lab 2" },
      { subject: maths, teacher: t1, room: "14" },
      { subject: arabic, teacher: t2, room: "7" },
    ],
  },
  {
    day: 5,
    en: "Friday",
    ar: "الجمعة",
    lessons: [
      { subject: arabic, teacher: t2, room: "7" },
      { subject: english, teacher: t2, room: "5" },
      { subject: maths, teacher: t1, room: "12" },
    ],
  },
];

export default function StudentTimetablePractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(9000);
  const [picked, setPicked] = useState<string | null>(null);

  function pick(dayIdx: number, slotIdx: number) {
    const d = WEEK[dayIdx]!;
    const slot = SLOTS[slotIdx]!;
    const lesson = d.lessons[slotIdx]!;
    setPicked(`${d.day}-${slotIdx}`);
    const subject = FakePeople.name(lesson.subject, locale);
    const detail = tr(
      locale,
      `${d.en} ${slot.start}: ${subject} with ${FakePeople.name(lesson.teacher, locale)}, room ${lesson.room}.`,
      `${d.ar} ${slot.start}: ${subject} مع ${FakePeople.name(lesson.teacher, locale)}، القاعة ${lesson.room}.`,
    );
    const isWednesday = d.day === 3 && slotIdx === 1;
    const isThursdayMaths = d.day === 4 && lesson.subject.id === "m1";
    if (isWednesday) completeTask("wednesday");
    if (isThursdayMaths) completeTask("thursday-maths");
    if (isWednesday || isThursdayMaths) {
      show(`${tr(locale, "Yes.", "صحيح.")} ${detail}`);
    } else {
      show(
        `${detail} ${tr(
          locale,
          "This is not the lesson in the task. Check the day on the card and the start time.",
          "هذه ليست الحصة المطلوبة في المهمة. تحقق من اليوم على البطاقة ومن وقت البدء.",
        )}`,
        "info",
      );
    }
  }

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={tr(locale, "My timetable", "جدولي الزمني")}
      description={FakePeople.name(FakePeople.classes[0]!, locale)}
    >
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "wednesday", text: tr(locale, "On the Wednesday card, press the lesson that starts at 09:00.", "في بطاقة الأربعاء، اضغط على الحصة التي تبدأ الساعة 09:00.") },
          { id: "thursday-maths", text: tr(locale, "On the Thursday card, press Mathematics.", "في بطاقة الخميس، اضغط على الرياضيات.") },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WEEK.map((d, dayIdx) => (
          <div key={d.day} className="card p-4">
            <h4 className="mb-3 border-b border-slate-100 pb-2.5 text-sm font-semibold text-slate-900 dark:border-navy-800 dark:text-white">{d[locale]}</h4>
            <ul className="space-y-1">
              {d.lessons.map((l, slotIdx) => {
                const slot = SLOTS[slotIdx]!;
                const isPicked = picked === `${d.day}-${slotIdx}`;
                return (
                  <li key={slotIdx}>
                    <button
                      type="button"
                      onClick={() => pick(dayIdx, slotIdx)}
                      aria-pressed={isPicked}
                      className={cn(
                        "w-full rounded-sm border-s-2 border-navy-600 py-1 ps-2.5 pe-1 text-start transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:border-navy-300 dark:hover:bg-white/[0.04]",
                        isPicked && "bg-slate-50 dark:bg-white/[0.06]",
                      )}
                    >
                      <span className="tabular block whitespace-nowrap text-xs font-medium text-slate-500 dark:text-navy-400">
                        <bdi dir="ltr">
                          {slot.start} – {slot.end}
                        </bdi>
                      </span>
                      <span className="mt-1 block text-sm font-medium text-slate-900 dark:text-white">{FakePeople.name(l.subject, locale)}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-navy-400">{FakePeople.name(l.teacher, locale)}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-navy-400">
                        {tr(locale, "Room", "القاعة")} <bdi>{l.room}</bdi>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </PracticeFrame>
  );
}
