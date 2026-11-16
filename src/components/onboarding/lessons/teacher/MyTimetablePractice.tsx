"use client";

import { useState } from "react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { formatTime } from "@/lib/utils";
import { DAY_NAMES, Guide, classById, nameOf, pick, subjectById } from "./shared";

const ENTRIES = [
  { id: "a", day: 1, start: "08:30", end: "09:15", subjectId: "m1", classId: "c1", room: "4" },
  { id: "b", day: 1, start: "10:00", end: "10:45", subjectId: "m1", classId: "c2", room: "2" },
  { id: "c", day: 2, start: "09:00", end: "09:45", subjectId: "m2", classId: "c1", room: "Lab" },
  { id: "d", day: 2, start: "11:00", end: "11:45", subjectId: "m1", classId: "c1", room: "4" },
  { id: "e", day: 3, start: "10:00", end: "10:45", subjectId: "m2", classId: "c1", room: "Lab" },
];

const TEXT = {
  title: { en: "My timetable", ar: "جدولي الزمني" },
  sub: { en: "Every class you teach, across the week.", ar: "كل فصل تُدرّسه، على مدار الأسبوع." },
  none: { en: "No classes", ar: "لا توجد حصص" },
  room: { en: "Room", ar: "القاعة" },
  q1: { en: "In which room is your first lesson on Tuesday?", ar: "في أي قاعة حصتك الأولى يوم الثلاثاء؟" },
  q2: { en: "Which class do you teach on Monday at 10:00?", ar: "أي فصل تدرّسه يوم الإثنين الساعة 10:00؟" },
  ok: { en: "Correct.", ar: "صحيح." },
  no: { en: "Not quite. Look at that day's card again.", ar: "ليس تمامًا. انظر إلى بطاقة ذلك اليوم مرة أخرى." },
  guide: {
    en: "This page is read-only: you can look but not change anything. Use the day cards to answer the two questions. To change a timetable, use the Timetable page.",
    ar: "هذه الصفحة للقراءة فقط: يمكنك النظر دون تغيير شيء. استخدم بطاقات الأيام للإجابة عن السؤالين. ولتعديل جدول استخدم صفحة «الجدول الزمني».",
  },
} as const;

function Question({
  id,
  legend,
  options,
  correct,
  locale,
  onCorrect,
}: {
  id: string;
  legend: string;
  options: { value: string; label: string }[];
  correct: string;
  locale: PracticeProps["locale"];
  onCorrect: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-800 dark:bg-navy-900">
      <legend className="px-1 text-sm font-medium text-slate-900 dark:text-white">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700 dark:text-navy-100">
            <input
              type="radio"
              name={`practice-mt-${id}`}
              value={o.value}
              checked={picked === o.value}
              onChange={() => {
                setPicked(o.value);
                if (o.value === correct) onCorrect();
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-slate-600 dark:text-navy-200">
        {picked ? (picked === correct ? TEXT.ok[locale] : TEXT.no[locale]) : ""}
      </p>
    </fieldset>
  );
}

export default function MyTimetablePractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const days = DAY_NAMES[locale];
  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")} description={L("sub")}>
      <Guide level={level}>{L("guide")}</Guide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((d) => {
          const list = ENTRIES.filter((e) => e.day === d);
          return (
            <div key={d} className="card p-4">
              <h4 className="mb-3 border-b border-slate-100 pb-2.5 text-sm font-semibold text-slate-900 dark:border-navy-800 dark:text-white">{days[d]}</h4>
              {list.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-navy-500">{L("none")}</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((e) => (
                    <li key={e.id} className="border-s-2 border-navy-600 py-0.5 ps-2.5 dark:border-navy-300">
                      <p className="tabular whitespace-nowrap text-xs font-medium text-slate-500 dark:text-navy-400">
                        <bdi dir="ltr">{formatTime(e.start)} – {formatTime(e.end)}</bdi>
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{nameOf(subjectById(e.subjectId), locale)}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{nameOf(classById(e.classId), locale)}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{L("room")} <bdi>{e.room}</bdi></p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <div className="space-y-3">
        <Question
          id="room"
          legend={L("q1")}
          locale={locale}
          correct="Lab"
          options={[
            { value: "4", label: `${L("room")} 4` },
            { value: "Lab", label: `${L("room")} Lab` },
            { value: "2", label: `${L("room")} 2` },
          ]}
          onCorrect={() => completeTask("find-room")}
        />
        <Question
          id="class"
          legend={L("q2")}
          locale={locale}
          correct="c2"
          options={[
            { value: "c1", label: nameOf(classById("c1"), locale) },
            { value: "c2", label: nameOf(classById("c2"), locale) },
          ]}
          onCorrect={() => completeTask("find-class")}
        />
      </div>
    </PracticeFrame>
  );
}
