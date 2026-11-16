"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect } from "./common";

const DAYS = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

const T = {
  en: {
    title: "Timetable",
    subtitle: "Build the weekly schedule for each class.",
    class: "Class",
    addPeriod: "Add a period",
    subject: "Subject (teacher assigned automatically)",
    chooseSubject: "Choose subject",
    teacher: "Teacher",
    day: "Day",
    start: "Start time",
    end: "End time",
    room: "Room (optional)",
    add: "Add period",
    remove: "Remove",
    empty: "Nothing yet",
    errOrder: "End time must be after start time.",
    errClass: (s: string, e: string) => `This class already has a period from ${s} to ${e} that overlaps.`,
    errTeacher: (s: string, e: string) => `This teacher is already teaching another class from ${s} to ${e}.`,
    errPick: "That subject and teacher aren't assigned to this class.",
    added: "Period added to the timetable.",
    guide:
      "Step 1: add Mathematics on Monday 09:00 to 09:45 for the first class. Step 2: add English on Monday 09:30 to 10:15 for the same class and read the refusal. Step 3: switch to the second class and add Mathematics on Monday 09:00; its teacher is already busy.",
  },
  ar: {
    title: "الجدول الزمني",
    subtitle: "إنشاء الجدول الأسبوعي لكل فصل.",
    class: "الفصل",
    addPeriod: "إضافة حصة",
    subject: "المادة (يتم تعيين المعلم تلقائيًا)",
    chooseSubject: "اختر المادة",
    teacher: "المعلم",
    day: "اليوم",
    start: "وقت البدء",
    end: "وقت الانتهاء",
    room: "القاعة (اختياري)",
    add: "إضافة الحصة",
    remove: "إزالة",
    empty: "لا شيء بعد",
    errOrder: "يجب أن يكون وقت الانتهاء بعد وقت البدء.",
    errClass: (s: string, e: string) => `يوجد في هذا الفصل حصة من ${s} إلى ${e} تتداخل مع هذا الوقت.`,
    errTeacher: (s: string, e: string) => `هذا المعلم يدرّس فصلًا آخر من ${s} إلى ${e}.`,
    errPick: "هذه المادة وهذا المعلم غير مُسندين إلى هذا الفصل.",
    added: "أُضيفت الحصة إلى الجدول الزمني.",
    guide:
      "الخطوة 1: أضف الرياضيات يوم الاثنين من 09:00 إلى 09:45 للفصل الأول. الخطوة 2: أضف اللغة الإنجليزية يوم الاثنين من 09:30 إلى 10:15 للفصل نفسه واقرأ سبب الرفض. الخطوة 3: انتقل إلى الفصل الثاني وأضف الرياضيات يوم الاثنين الساعة 09:00؛ معلمها مشغول بالفعل.",
  },
};

/** subject id -> teacher id, per class. */
const ASSIGN: Record<string, Record<string, string>> = {
  c1: { m1: "t1", m3: "t2", m2: "t3" },
  c2: { m1: "t1", m4: "t2" },
};

interface Period {
  id: string;
  classId: string;
  subject: string;
  teacher: string;
  day: number;
  start: string;
  end: string;
  room: string;
}

const toMin = (v: string) => {
  const [h = 0, m = 0] = v.split(":").map(Number);
  return h * 60 + m;
};
const overlaps = (a: Period | { start: string; end: string }, b: { start: string; end: string }) =>
  toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

export default function TimetablePractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const days = DAYS[locale];
  const [classId, setClassId] = useState("c1");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subject, setSubject] = useState("");
  const [day, setDay] = useState("0");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:45");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const assigned = ASSIGN[classId] ?? {};
  const nameOf = (list: { id: string; en: string; ar: string }[], id: string) => list.find((x) => x.id === id)?.[locale] ?? "";
  const teacherId = assigned[subject];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!teacherId) return setMessage({ tone: "error", text: t.errPick });
    if (toMin(end) <= toMin(start)) return setMessage({ tone: "error", text: t.errOrder });
    const d = Number(day);
    const clash = periods.find((p) => p.classId === classId && p.day === d && overlaps(p, { start, end }));
    if (clash) {
      setMessage({ tone: "error", text: t.errClass(clash.start, clash.end) });
      completeTask("class-clash");
      return;
    }
    const busy = periods.find((p) => p.classId !== classId && p.teacher === teacherId && p.day === d && overlaps(p, { start, end }));
    if (busy) {
      setMessage({ tone: "error", text: t.errTeacher(busy.start, busy.end) });
      completeTask("teacher-clash");
      return;
    }
    setPeriods((prev) => [...prev, { id: `p${prev.length}-${Date.now()}`, classId, subject, teacher: teacherId, day: d, start, end, room }]);
    setMessage({ tone: "success", text: t.added });
    completeTask("place-period");
  }

  const classPeriods = periods.filter((p) => p.classId === classId);

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <NativeSelect
        label={t.class}
        name="practice-tt-class"
        value={classId}
        onChange={(e) => {
          setClassId(e.target.value);
          setSubject("");
          setMessage(null);
        }}
        options={FakePeople.classes.map((c) => ({ value: c.id, label: c[locale] }))}
      />
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <Card className="space-y-4 p-5">
          <h4 className="section-title">{t.addPeriod}</h4>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <NativeSelect
              label={t.subject}
              name="practice-tt-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              hint={teacherId ? `${t.teacher}: ${nameOf(FakePeople.teachers, teacherId)}` : undefined}
              options={[
                { value: "", label: t.chooseSubject },
                ...Object.keys(assigned).map((id) => ({ value: id, label: nameOf(FakePeople.subjects, id) })),
              ]}
            />
            <NativeSelect label={t.day} name="practice-tt-day" value={day} onChange={(e) => setDay(e.target.value)} options={days.map((d, i) => ({ value: String(i), label: d }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t.start} name="practice-tt-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label={t.end} name="practice-tt-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Input label={t.room} name="practice-tt-room" value={room} onChange={(e) => setRoom(e.target.value)} />
            <Button type="submit">{t.add}</Button>
          </form>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
        </Card>
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {days.map((label, i) => {
            const list = classPeriods.filter((p) => p.day === i).sort((a, b) => toMin(a.start) - toMin(b.start));
            return (
              <Card key={label} className="p-4">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">{label}</h5>
                {list.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400 dark:text-navy-500">{t.empty}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {list.map((p) => (
                      <li key={p.id} className="rounded-md bg-slate-50 p-2 text-sm dark:bg-white/5">
                        <p className="font-medium text-slate-900 dark:text-white">{nameOf(FakePeople.subjects, p.subject)}</p>
                        <p className="text-xs text-slate-600 dark:text-navy-200">
                          <bdi dir="ltr">
                            {p.start} - {p.end}
                          </bdi>
                          {" · "}
                          {nameOf(FakePeople.teachers, p.teacher)}
                          {p.room ? ` · ${p.room}` : ""}
                        </p>
                        <LinkButton danger onClick={() => setPeriods((prev) => prev.filter((x) => x.id !== p.id))}>
                          {t.remove}
                          <span className="sr-only"> {nameOf(FakePeople.subjects, p.subject)}</span>
                        </LinkButton>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </PracticeFrame>
  );
}
