"use client";

import { useState, type FormEvent } from "react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, SAVE_OK, TEACHES, classById, nameOf, pairKey, pairLabel, pick, subjectById } from "./shared";

interface Exam {
  id: number;
  title: string;
  type: "exam" | "quiz";
  date: string;
  classId: string;
  subjectId: string;
}

const TEXT = {
  title: { en: "Exams & Quizzes", ar: "الاختبارات والمذاكرات" },
  newExam: { en: "New Exam/Quiz", ar: "اختبار/مذاكرة جديد" },
  target: { en: "Class — Subject", ar: "الفصل — المادة" },
  titleLabel: { en: "Title", ar: "العنوان" },
  type: { en: "Type", ar: "النوع" },
  exam: { en: "Exam", ar: "اختبار" },
  quiz: { en: "Quiz", ar: "مذاكرة" },
  date: { en: "Date", ar: "التاريخ" },
  time: { en: "Time", ar: "الوقت" },
  room: { en: "Room", ar: "القاعة" },
  submit: { en: "Submit", ar: "إرسال" },
  none: { en: "No exams or quizzes scheduled.", ar: "لا توجد اختبارات أو مذاكرات مجدولة." },
  class: { en: "Class", ar: "الفصل" },
  subject: { en: "Subject", ar: "المادة" },
  needTitle: { en: "Title is required.", ar: "العنوان مطلوب." },
  needDate: { en: "Date is required.", ar: "التاريخ مطلوب." },
  notified: {
    en: "Students of the class get a notification: “New exam: {title}”, with the date and time. Their parents are not notified, and no marks are entered here (that is Grades).",
    ar: "يصل إلى طلاب الفصل إشعار: «اختبار جديد: {title}» مع التاريخ والوقت. ولا يُرسَل إشعار لأولياء الأمور، ولا تُدخَل الدرجات هنا (فهذا في «الدرجات»).",
  },
  guide: {
    en: "Choose the class and subject, give the exam a title and a date, and press Submit. The time and room are optional. Choose Quiz in Type for a quiz.",
    ar: "اختر الفصل والمادة، وأعطِ الاختبار عنوانًا وتاريخًا، ثم اضغط «إرسال». الوقت والقاعة اختياريان. اختر «مذاكرة» في النوع إن كان مذاكرة.",
  },
} as const;

export default function ExamsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const [target, setTarget] = useState(pairKey(TEACHES[0]!));
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"exam" | "quiz">("exam");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    if (!title.trim()) return setError(L("needTitle"));
    if (!date) return setError(L("needDate"));
    const [classId = "c1", subjectId = "m1"] = target.split(":");
    setExams((l) => [{ id: l.length + 1, title: title.trim(), type, date, classId, subjectId }, ...l]);
    setError(null);
    setSaved(L("notified").replace("{title}", title.trim()));
    setTitle("");
    setDate("");
    setTime("");
    setRoom("");
    completeTask("schedule");
    if (type === "quiz") completeTask("quiz");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")}>
      <Guide level={level}>{L("guide")}</Guide>
      <Card>
        <h4 className="mb-4 card-title">{L("newExam")}</h4>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          {saved && (
            <>
              <Alert tone="success">{SAVE_OK[locale]}</Alert>
              <Alert tone="info">{saved}</Alert>
            </>
          )}
          <Select label={L("target")} name="practice-exm-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {TEACHES.map((p) => (
              <option key={pairKey(p)} value={pairKey(p)}>{pairLabel(p, locale)}</option>
            ))}
          </Select>
          <Input label={L("titleLabel")} name="practice-exm-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select label={L("type")} name="practice-exm-type" value={type} onChange={(e) => setType(e.target.value as "exam" | "quiz")}>
            <option value="exam">{L("exam")}</option>
            <option value="quiz">{L("quiz")}</option>
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label={L("date")} name="practice-exm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label={L("time")} name="practice-exm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Input label={L("room")} name="practice-exm-room" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <Button type="submit">{L("submit")}</Button>
        </form>
      </Card>

      {exams.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{L("none")}</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{L("titleLabel")}</Th>
              <Th>{L("class")}</Th>
              <Th>{L("subject")}</Th>
              <Th>{L("type")}</Th>
              <Th>{L("date")}</Th>
            </tr>
          </Thead>
          <Tbody>
            {exams.map((x) => (
              <tr key={x.id}>
                <Td className="font-medium text-slate-900 dark:text-white">{x.title}</Td>
                <Td>{nameOf(classById(x.classId), locale)}</Td>
                <Td>{nameOf(subjectById(x.subjectId), locale)}</Td>
                <Td><Badge tone={x.type === "exam" ? "navy" : "gold"}>{L(x.type)}</Badge></Td>
                <Td><bdi dir="ltr">{x.date}</bdi></Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PracticeFrame>
  );
}
