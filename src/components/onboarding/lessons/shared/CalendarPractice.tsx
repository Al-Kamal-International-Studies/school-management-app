"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { pick, type L } from "./l10n";

type EventType = "event" | "holiday" | "deadline";
type Audience = "all" | "teachers" | "students" | "parents";

interface Ev {
  id: string;
  day: number;
  month: L;
  title: L;
  type: EventType;
  audience: Audience;
  description?: L;
}

const NOV: L = { en: "Nov", ar: "نوفمبر" };
const DEC: L = { en: "Dec", ar: "ديسمبر" };

const NATIONAL_DAY: Ev = {
  id: "national",
  day: 2,
  month: DEC,
  title: { en: "National Day holiday", ar: "عطلة اليوم الوطني" },
  type: "holiday",
  audience: "all",
  description: { en: "The school is closed.", ar: "المدرسة مغلقة." },
};
const WINTER: Ev = {
  id: "winter",
  day: 20,
  month: DEC,
  title: { en: "Winter break begins", ar: "بداية العطلة الشتوية" },
  type: "holiday",
  audience: "all",
};

const EVENTS: Record<Exclude<UserRole, "admin">, Ev[]> = {
  teacher: [
    { id: "staff", day: 20, month: NOV, title: { en: "Staff meeting", ar: "اجتماع المعلمين" }, type: "event", audience: "teachers", description: { en: "In the library after the last lesson.", ar: "في المكتبة بعد الحصة الأخيرة." } },
    NATIONAL_DAY,
    { id: "grades", day: 8, month: DEC, title: { en: "Term 1 grades deadline", ar: "الموعد النهائي لدرجات الفصل الأول" }, type: "deadline", audience: "teachers" },
    WINTER,
  ],
  student: [
    { id: "sports", day: 21, month: NOV, title: { en: "Sports day", ar: "يوم الرياضة" }, type: "event", audience: "students", description: { en: "Bring your sports clothes.", ar: "أحضر ملابس الرياضة." } },
    NATIONAL_DAY,
    { id: "books", day: 5, month: DEC, title: { en: "Library books due", ar: "موعد إرجاع كتب المكتبة" }, type: "deadline", audience: "students" },
    WINTER,
  ],
  parent: [
    { id: "evening", day: 25, month: NOV, title: { en: "Parents' evening", ar: "أمسية أولياء الأمور" }, type: "event", audience: "parents", description: { en: "Meet your child's teachers.", ar: "تعرّف على معلمي ابنك." } },
    NATIONAL_DAY,
    { id: "books", day: 5, month: DEC, title: { en: "Library books due", ar: "موعد إرجاع كتب المكتبة" }, type: "deadline", audience: "students" },
    WINTER,
  ],
};

const TYPE_TONE: Record<EventType, "navy" | "gold" | "red"> = { event: "navy", holiday: "gold", deadline: "red" };
const TYPE_LABEL: Record<EventType, L> = {
  event: { en: "Event", ar: "حدث" },
  holiday: { en: "Holiday", ar: "عطلة" },
  deadline: { en: "Deadline", ar: "موعد نهائي" },
};
const AUDIENCE_NOTE: Record<Audience, L> = {
  all: { en: "Everyone", ar: "الجميع" },
  teachers: { en: "Teachers only", ar: "المعلمون فقط" },
  students: { en: "Students and their parents", ar: "الطلاب وأولياء أمورهم" },
  parents: { en: "Parents only", ar: "أولياء الأمور فقط" },
};

const UI = {
  en: {
    title: "Calendar",
    note: "Practice note: shown to",
    question: "Press the card that matches the task. The real Calendar page is a read-only list; pressing is only for practice.",
    ok: { holiday: "Yes, that one has the Holiday badge.", deadline: "Yes, that one has the Deadline badge.", audience: "Yes, that event is not for everyone. Admins chose its audience when they added it." },
    no: { holiday: "That one is a {type}. Look for the Holiday badge.", deadline: "That one is a {type}. Look for the Deadline badge.", audience: "That event is shown to everyone. Look at the practice note for one that is not." },
  },
  ar: {
    title: "التقويم",
    note: "ملاحظة تدريبية: يظهر لـ",
    question: "اضغط البطاقة التي تناسب المهمة. صفحة التقويم الحقيقية قائمة للقراءة فقط، والضغط هنا للتدريب فقط.",
    ok: { holiday: "صحيح، هذا الحدث عليه شارة «عطلة».", deadline: "صحيح، هذا الحدث عليه شارة «موعد نهائي».", audience: "صحيح، هذا الحدث ليس للجميع. اختار المدراء جمهوره عند إضافته." },
    no: { holiday: "هذا الحدث من نوع «{type}». ابحث عن شارة «عطلة».", deadline: "هذا الحدث من نوع «{type}». ابحث عن شارة «موعد نهائي».", audience: "هذا الحدث يظهر للجميع. انظر إلى الملاحظة التدريبية لتجد حدثًا ليس للجميع." },
  },
} as const;

export default function CalendarPractice({ role, locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const events = EVENTS[role === "admin" ? "teacher" : role];
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function choose(ev: Ev) {
    setPicked(ev.id);
    // A press counts for every task it answers; otherwise explain against the first open task.
    const order = ["holiday", "deadline", "audience"] as const;
    const fits = (t: (typeof order)[number]) => (t === "audience" ? ev.audience !== "all" : ev.type === t);
    const open = order.filter((t) => !completedTasks.has(t));
    const matched = open.filter(fits);
    if (matched.length > 0) {
      matched.forEach((t) => completeTask(t));
      setFeedback({ ok: true, text: ui.ok[matched[0]!] });
      return;
    }
    const goal = open[0];
    if (!goal) {
      setFeedback(null);
      return;
    }
    setFeedback({ ok: false, text: ui.no[goal].replace("{type}", pick(TYPE_LABEL[ev.type], locale).toLowerCase()) });
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.title}>
      {level === "new" && <p className="text-sm text-slate-600 dark:text-navy-200">{ui.question}</p>}
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              aria-pressed={picked === ev.id}
              onClick={() => choose(ev)}
              className={`card flex w-full items-start gap-4 p-6 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 ${picked === ev.id ? "ring-2 ring-navy-500" : ""}`}
            >
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 text-slate-900 dark:border-navy-700 dark:text-white">
                <span className="tabular text-base font-semibold leading-none">{ev.day}</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-navy-400">{pick(ev.month, locale)}</span>
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy-900 dark:text-white">{pick(ev.title, locale)}</span>
                  <Badge tone={TYPE_TONE[ev.type]}>{pick(TYPE_LABEL[ev.type], locale)}</Badge>
                </span>
                {ev.description && <span className="mt-1 block text-sm text-slate-600 dark:text-navy-200">{pick(ev.description, locale)}</span>}
                <span className="mt-2 block text-xs italic text-slate-500 dark:text-navy-300">
                  {ui.note}: {pick(AUDIENCE_NOTE[ev.audience], locale)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite" className="min-h-0">
        {feedback && (
          <p
            className={`rounded-lg border px-3.5 py-3 text-sm ${
              feedback.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </PracticeFrame>
  );
}
