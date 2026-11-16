"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, ClipboardCheck, ClipboardList, School, Users } from "lucide-react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { StatCard } from "@/components/ui/Card";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { formatTime } from "@/lib/utils";
import { Guide, ROSTER, TEACHES, classById, nameOf, pick, subjectById, teacherById } from "./shared";

const TODAY = [
  { id: "l1", start: "08:30", end: "09:15", subjectId: "m1", classId: "c1", room: "4" },
  { id: "l2", start: "10:00", end: "10:45", subjectId: "m1", classId: "c2", room: "2" },
];

const TEXT = {
  welcome: { en: "Welcome", ar: "مرحبًا" },
  desc: { en: "Today's schedule and your classes.", ar: "جدول اليوم وفصولك." },
  submitProgress: { en: "Submit Progress", ar: "إرسال التقدم" },
  myClasses: { en: "My Classes", ar: "فصولي" },
  students: { en: "Students", ar: "الطلاب" },
  upcoming: { en: "Upcoming exams", ar: "الاختبارات القادمة" },
  pending: { en: "Pending grading", ar: "بانتظار التصحيح" },
  today: { en: "Today's schedule", ar: "جدول اليوم" },
  room: { en: "Room", ar: "القاعة" },
  class: { en: "Class", ar: "الفصل" },
  subject: { en: "Subject", ar: "المادة" },
  guide: {
    en: "This is your home page. Each lesson in Today's schedule and each row in My Classes is a shortcut to that class's attendance. Click one.",
    ar: "هذه صفحتك الرئيسية. كل حصة في «جدول اليوم» وكل صف في «فصولي» هو اختصار إلى حضور ذلك الفصل. اضغط على أحدها.",
  },
  toAttendance: {
    en: "On the real page this opens Attendance with {class} already chosen, ready to mark today.",
    ar: "في الصفحة الحقيقية يفتح هذا «الحضور» وقد اختير فيه {class} جاهزًا لتسجيل حضور اليوم.",
  },
  toProgress: {
    en: "On the real page this opens Progress, where you file the monthly report.",
    ar: "في الصفحة الحقيقية يفتح هذا «التقدم» حيث تقدّم التقرير الشهري.",
  },
} as const;

export default function MyClassesPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const [note, setNote] = useState<string | null>(null);
  const me = teacherById("t1");
  const go = (classId: string, task: string) => {
    setNote(L("toAttendance").replace("{class}", nameOf(classById(classId), locale)));
    completeTask(task);
  };

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={`${L("welcome")}, ${nameOf(me, locale)}`}
      description={L("desc")}
      action={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setNote(L("toProgress"))}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          {L("submitProgress")}
        </button>
      }
    >
      <Guide level={level}>{L("guide")}</Guide>
      <div aria-live="polite">{note && <Alert tone="info">{note}</Alert>}</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={L("myClasses")} value={2} icon={School} />
        <StatCard label={L("students")} value={Object.values(ROSTER).flat().length} icon={Users} />
        <StatCard label={L("upcoming")} value={1} icon={CalendarDays} />
        <StatCard label={L("pending")} value={2} icon={ClipboardCheck} />
      </div>

      <section className="space-y-3" aria-labelledby="practice-mc-today">
        <h4 id="practice-mc-today" className="section-title">{L("today")}</h4>
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-navy-800">
            {TODAY.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => go(e.classId, "todays-lesson")}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-start transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]"
                >
                  <span className="tabular w-[8.75rem] shrink-0 whitespace-nowrap text-sm text-slate-500 dark:text-navy-400">
                    <bdi dir="ltr">{formatTime(e.start)} – {formatTime(e.end)}</bdi>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{nameOf(subjectById(e.subjectId), locale)}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-navy-400">{nameOf(classById(e.classId), locale)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-navy-400">{L("room")} <bdi>{e.room}</bdi></span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180 dark:text-navy-600" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="practice-mc-classes">
        <h4 id="practice-mc-classes" className="section-title">{L("myClasses")}</h4>
        <Table>
          <Thead>
            <tr>
              <Th>{L("class")}</Th>
              <Th>{L("subject")}</Th>
              <Th>{L("students")}</Th>
            </tr>
          </Thead>
          <Tbody>
            {TEACHES.map((p) => (
              <tr key={`${p.classId}-${p.subjectId}`} className="relative">
                <Td className="font-medium text-slate-900 dark:text-white">
                  <button
                    type="button"
                    onClick={() => go(p.classId, "class-row")}
                    className="text-start outline-none before:absolute before:inset-0 before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-navy-400 dark:focus-visible:before:ring-navy-300"
                  >
                    {nameOf(classById(p.classId), locale)}
                  </button>
                </Td>
                <Td>{nameOf(subjectById(p.subjectId), locale)}</Td>
                <Td>{ROSTER[p.classId]?.length ?? 0}</Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </section>
    </PracticeFrame>
  );
}
