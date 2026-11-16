"use client";

import { useState, type FormEvent } from "react";
import { PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import type { PracticeProps } from "@/lib/onboarding/types";
import { formatTime } from "@/lib/utils";
import { DAY_NAMES, Guide, classById, nameOf, pick, subjectById, teacherById } from "./shared";

interface Entry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  day: number;
  start: string;
  end: string;
  room: string;
}

/** Subject and teacher pairs assigned to each fake class. */
const ASSIGNED: Record<string, { subjectId: string; teacherId: string }[]> = {
  c1: [
    { subjectId: "m1", teacherId: "t1" },
    { subjectId: "m3", teacherId: "t2" },
    { subjectId: "m2", teacherId: "t1" },
  ],
  c2: [
    { subjectId: "m1", teacherId: "t1" },
    { subjectId: "m4", teacherId: "t3" },
  ],
};

const START: Entry[] = [
  { id: "e1", classId: "c1", subjectId: "m3", teacherId: "t2", day: 1, start: "09:00", end: "09:45", room: "4" },
  { id: "e2", classId: "c1", subjectId: "m2", teacherId: "t1", day: 3, start: "10:00", end: "10:45", room: "Lab" },
  { id: "e3", classId: "c2", subjectId: "m1", teacherId: "t1", day: 1, start: "10:00", end: "10:45", room: "2" },
];

const TEXT = {
  title: { en: "Timetable", ar: "الجدول الزمني" },
  subtitle: { en: "Build the weekly schedule for each class.", ar: "إنشاء الجدول الأسبوعي لكل فصل." },
  class: { en: "Class", ar: "الفصل" },
  addPeriod: { en: "Add a period", ar: "إضافة حصة" },
  editPeriod: { en: "Edit period", ar: "تعديل الحصة" },
  saveChanges: { en: "Save changes", ar: "حفظ التغييرات" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  subject: { en: "Subject (teacher assigned automatically)", ar: "المادة (يتم تعيين المعلم تلقائيًا)" },
  chooseSubject: { en: "Choose subject", ar: "اختر المادة" },
  day: { en: "Day", ar: "اليوم" },
  start: { en: "Start time", ar: "وقت البدء" },
  end: { en: "End time", ar: "وقت الانتهاء" },
  room: { en: "Room (optional)", ar: "القاعة (اختياري)" },
  roomShort: { en: "Room", ar: "القاعة" },
  edit: { en: "Edit", ar: "تعديل" },
  remove: { en: "Remove", ar: "إزالة" },
  confirmRemove: { en: "Remove this period from the timetable?", ar: "هل تريد إزالة هذه الحصة من الجدول؟" },
  noClasses: { en: "No classes", ar: "لا توجد حصص" },
  needSubject: { en: "Choose a subject first.", ar: "اختر المادة أولًا." },
  needStart: { en: "Enter a start time.", ar: "أدخل وقت البدء." },
  needEnd: { en: "Enter an end time.", ar: "أدخل وقت الانتهاء." },
  endAfter: { en: "End time must be after start time.", ar: "يجب أن يكون وقت الانتهاء بعد وقت البدء." },
  added: { en: "Period added to the timetable.", ar: "أُضيفت الحصة إلى الجدول." },
  edited: { en: "Period changed.", ar: "تم تعديل الحصة." },
  removed: { en: "Period removed.", ar: "أُزيلت الحصة." },
  guide: {
    en: "Pick a class, choose a subject, a day and the start and end times, then press Add a period. Each period shows in its day card. Edit and Remove sit under each period.",
    ar: "اختر الفصل، ثم المادة واليوم ووقتي البدء والانتهاء، ثم اضغط «إضافة حصة». تظهر كل حصة في بطاقة يومها، وتجد «تعديل» و«إزالة» تحتها.",
  },
} as const;

const hhmm = (t: string) => t.slice(0, 5);

function classClashMessage(locale: PracticeProps["locale"], s: string, e: string) {
  return pick(
    locale,
    `This class already has a period from ${s} to ${e} that overlaps.`,
    `لدى هذا الفصل حصة من ${s} إلى ${e} تتداخل مع هذا الوقت.`,
  );
}
function teacherClashMessage(locale: PracticeProps["locale"], s: string, e: string) {
  return pick(
    locale,
    `This teacher is already teaching another class from ${s} to ${e}.`,
    `هذا المعلم يدرّس فصلًا آخر من ${s} إلى ${e}.`,
  );
}

export default function TimetableBuilderPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const { toast, show } = useFakeToast();
  const [entries, setEntries] = useState<Entry[]>(START);
  const [classId, setClassId] = useState("c1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pair, setPair] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const days = DAY_NAMES[locale];
  const classEntries = entries.filter((e) => e.classId === classId);
  const visibleDays = [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== 7 || classEntries.some((e) => e.day === 7));

  function resetForm() {
    setEditingId(null);
    setPair("");
    setDay("1");
    setStart("");
    setEnd("");
    setRoom("");
    setError(null);
    setFormKey((k) => k + 1);
  }

  function startEdit(e: Entry) {
    setEditingId(e.id);
    setPair(`${e.subjectId}|${e.teacherId}`);
    setDay(String(e.day));
    setStart(e.start);
    setEnd(e.end);
    setRoom(e.room);
    setError(null);
    setFormKey((k) => k + 1);
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!pair) return setError(L("needSubject"));
    if (!start) return setError(L("needStart"));
    if (!end) return setError(L("needEnd"));
    if (end <= start) return setError(L("endAfter"));
    const [subjectId = "", teacherId = ""] = pair.split("|");
    const d = Number(day);
    const clash = entries.find(
      (e) =>
        e.id !== editingId &&
        e.day === d &&
        (e.classId === classId || e.teacherId === teacherId) &&
        hhmm(e.start) < end &&
        hhmm(e.end) > start,
    );
    if (clash) {
      if (clash.classId === classId) {
        setError(classClashMessage(locale, clash.start, clash.end));
        completeTask("class-clash");
      } else {
        setError(teacherClashMessage(locale, clash.start, clash.end));
        completeTask("teacher-clash");
      }
      return;
    }
    if (editingId) {
      setEntries((list) => list.map((e) => (e.id === editingId ? { ...e, subjectId, teacherId, day: d, start, end, room } : e)));
      show(L("edited"));
      completeTask("edit-period");
    } else {
      setEntries((list) => [...list, { id: `n${list.length + 1}-${Date.now()}`, classId, subjectId, teacherId, day: d, start, end, room }]);
      show(L("added"));
      completeTask("add-period");
    }
    resetForm();
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")} description={L("subtitle")}>
      <Guide level={level}>{L("guide")}</Guide>
      {toast}

      <div className="max-w-xs">
        <Select
          label={L("class")}
          name="practice-ttb-class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setConfirmId(null);
            resetForm();
          }}
        >
          {["c1", "c2"].map((c) => (
            <option key={c} value={c}>{nameOf(classById(c), locale)}</option>
          ))}
        </Select>
      </div>

      <Card>
        <h4 className="mb-4 card-title">{editingId ? L("editPeriod") : L("addPeriod")}</h4>
        <form key={formKey} onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Select label={L("subject")} name="practice-ttb-subject" value={pair} onChange={(e) => setPair(e.target.value)} required>
            <option value="" disabled>{L("chooseSubject")}</option>
            {(ASSIGNED[classId] ?? []).map((a) => (
              <option key={`${a.subjectId}|${a.teacherId}`} value={`${a.subjectId}|${a.teacherId}`}>
                {nameOf(subjectById(a.subjectId), locale)} — {nameOf(teacherById(a.teacherId), locale)}
              </option>
            ))}
          </Select>
          <Select label={L("day")} name="practice-ttb-day" value={day} onChange={(e) => setDay(e.target.value)} required>
            {days.slice(1).map((n, i) => (
              <option key={n} value={String(i + 1)}>{n}</option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={L("start")} name="practice-ttb-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
            <Input label={L("end")} name="practice-ttb-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
          <Input label={L("room")} name="practice-ttb-room" value={room} onChange={(e) => setRoom(e.target.value)} />
          <div className="flex items-center gap-4">
            <Button type="submit">{editingId ? L("saveChanges") : L("addPeriod")}</Button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-600 hover:text-navy-900 hover:underline dark:text-navy-300 dark:hover:text-white">
                {L("cancel")}
              </button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleDays.map((d) => {
          const list = classEntries.filter((e) => e.day === d).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div key={d} className="card p-4">
              <h4 className="mb-3 border-b border-slate-100 pb-2.5 text-sm font-semibold text-slate-900 dark:border-navy-800 dark:text-white">{days[d]}</h4>
              {list.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-navy-500">{L("noClasses")}</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((e) => (
                    <li key={e.id} className="border-s-2 border-navy-600 py-0.5 ps-2.5 dark:border-navy-300">
                      <p className="tabular whitespace-nowrap text-xs font-medium text-slate-500 dark:text-navy-400">
                        <bdi dir="ltr">{formatTime(e.start)} – {formatTime(e.end)}</bdi>
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{nameOf(subjectById(e.subjectId), locale)}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{nameOf(teacherById(e.teacherId), locale)}</p>
                      {e.room && <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">{L("roomShort")} <bdi>{e.room}</bdi></p>}
                      {confirmId === e.id ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-slate-700 dark:text-navy-100">{L("confirmRemove")}</p>
                          <div className="flex gap-3 text-xs font-medium">
                            <button
                              type="button"
                              className="text-red-700 hover:underline dark:text-red-300"
                              onClick={() => {
                                setEntries((l) => l.filter((x) => x.id !== e.id));
                                setConfirmId(null);
                                if (editingId === e.id) resetForm();
                                show(L("removed"));
                              }}
                            >
                              {L("remove")}
                            </button>
                            <button type="button" className="text-slate-600 hover:underline dark:text-navy-300" onClick={() => setConfirmId(null)}>
                              {L("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-3 text-xs font-medium">
                          <button type="button" className="text-navy-600 hover:underline dark:text-navy-200" onClick={() => startEdit(e)}>
                            {L("edit")}
                          </button>
                          <button type="button" className="text-red-700 hover:underline dark:text-red-300" onClick={() => setConfirmId(e.id)}>
                            {L("remove")}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </PracticeFrame>
  );
}
