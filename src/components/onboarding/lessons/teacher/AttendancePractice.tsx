"use client";

import { useState, type FormEvent } from "react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, ROSTER, SAVE_OK, classById, isoDate, nameOf, pick, studentById } from "./shared";

type Status = "present" | "absent" | "late" | "excused";
const STATUSES: Status[] = ["present", "absent", "late", "excused"];
const TONE: Record<Status, "green" | "red" | "amber" | "slate"> = { present: "green", absent: "red", late: "amber", excused: "slate" };
const LABEL: Record<Status, { en: string; ar: string }> = {
  present: { en: "Present", ar: "حاضر" },
  absent: { en: "Absent", ar: "غائب" },
  late: { en: "Late", ar: "متأخر" },
  excused: { en: "Excused", ar: "معذور" },
};

interface Row {
  studentId: string;
  date: string;
  status: Status;
}

const TEXT = {
  title: { en: "Attendance", ar: "الحضور" },
  sub: { en: "Mark Attendance", ar: "تسجيل الحضور" },
  classLabel: { en: "Class", ar: "الفصل" },
  dateLabel: { en: "Date", ar: "التاريخ" },
  cont: { en: "Continue", ar: "متابعة" },
  submit: { en: "Submit", ar: "إرسال" },
  history: { en: "Attendance History", ar: "سجل الحضور" },
  noRecords: { en: "No attendance records yet.", ar: "لا توجد سجلات حضور بعد." },
  student: { en: "Student", ar: "الطالب" },
  date: { en: "Date", ar: "التاريخ" },
  status: { en: "Status", ar: "الحالة" },
  future: { en: "Attendance can't be marked for a future date.", ar: "لا يمكن تسجيل الحضور لتاريخ في المستقبل." },
  badDate: { en: "Enter a valid date.", ar: "أدخل تاريخًا صحيحًا." },
  pickPrompt: {
    en: "Choose a class and a date, then press Continue to open the sheet.",
    ar: "اختر الفصل والتاريخ، ثم اضغط «متابعة» لفتح الكشف.",
  },
  hintNew: {
    en: "Everyone starts as Present. Change only the students who are not, then press Submit. One record per student per day: saving again for the same day replaces the earlier marks.",
    ar: "يبدأ الجميع بحالة «حاضر». غيّر حالة الطلاب الآخرين فقط، ثم اضغط «إرسال». هناك سجل واحد لكل طالب في اليوم: الحفظ مرة أخرى لليوم نفسه يستبدل العلامات السابقة.",
  },
  taskHelp: {
    en: "Saved. For the practice task, set Omar Sample to Absent and Lina Sample to Late, then press Submit again. Saving again just replaces today's marks.",
    ar: "تم الحفظ. لإكمال مهمة التدريب، اجعل «عمر نموذج» غائبًا و«لينا نموذج» متأخرة، ثم اضغط «إرسال» مرة أخرى. الحفظ مجددًا يستبدل علامات اليوم فقط.",
  },
} as const;

export default function AttendancePractice({ locale, dir, level, completeTask, completedTasks }: PracticeProps) {
  const today = isoDate(0);
  const [classId, setClassId] = useState("c1");
  const [date, setDate] = useState(today);
  const [sheet, setSheet] = useState<{ classId: string; date: string } | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const [history, setHistory] = useState<Row[]>([
    { studentId: "s3", date: isoDate(-1), status: "late" },
    { studentId: "s2", date: isoDate(-1), status: "present" },
  ]);

  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const students = sheet ? ROSTER[sheet.classId] ?? [] : [];

  function onContinue(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMessage({ tone: "error", text: L("badDate") });
      return;
    }
    setSheet({ classId, date });
    setMarks({});
    setMessage(null);
    setExtra(null);
    completeTask("continue");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sheet) return;
    if (sheet.date > today) {
      setMessage({ tone: "error", text: L("future") });
      setExtra(null);
      completeTask("future-date");
      return;
    }
    const rows: Row[] = students.map((s) => ({ studentId: s.id, date: sheet.date, status: marks[s.id] ?? "present" }));
    setHistory((h) => [...rows, ...h.filter((r) => !rows.some((n) => n.studentId === r.studentId && n.date === r.date))]);
    setMessage({ tone: "success", text: SAVE_OK[locale] });
    const matches = marks["s1"] === "absent" && marks["s2"] === "late" && sheet.classId === "c1";
    if (matches) {
      completeTask("mark");
      setExtra(null);
    } else {
      setExtra(completedTasks.has("mark") ? null : L("taskHelp"));
    }
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")} description={L("sub")}>
      <Guide level={level}>{L("hintNew")}</Guide>

      <form onSubmit={onContinue} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="practice-att-class" className="label">{L("classLabel")}</label>
          <select
            id="practice-att-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="input w-auto bg-white dark:bg-navy-900"
          >
            {["c1", "c2"].map((c) => (
              <option key={c} value={c}>{nameOf(classById(c), locale)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="practice-att-date" className="label">{L("dateLabel")}</label>
          <input id="practice-att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
        </div>
        <button type="submit" className="btn-secondary">{L("cont")}</button>
      </form>

      {!sheet && <p className="text-sm text-slate-500 dark:text-navy-400">{L("pickPrompt")}</p>}

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {extra && <Alert tone="info">{extra}</Alert>}

      {sheet && (
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-navy-800 dark:border-navy-800">
              {students.map((s) => {
                const name = nameOf(studentById(s.id), locale);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                      <p className="text-xs text-slate-400 dark:text-navy-500"><bdi>{s.enrollment}</bdi></p>
                    </div>
                    <select
                      aria-label={`${L("status")}: ${name}`}
                      value={marks[s.id] ?? "present"}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value as Status }))}
                      className="input w-auto bg-white py-1.5 text-sm dark:bg-navy-900"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>{pick(locale, LABEL[st].en, LABEL[st].ar)}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <Button type="submit">{L("submit")}</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        <h4 className="section-title">{L("history")}</h4>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{L("noRecords")}</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{L("student")}</Th>
                <Th>{L("date")}</Th>
                <Th>{L("status")}</Th>
              </tr>
            </Thead>
            <Tbody>
              {history.map((r) => (
                <tr key={`${r.studentId}-${r.date}`}>
                  <Td className="font-medium text-slate-900 dark:text-white">{nameOf(studentById(r.studentId), locale)}</Td>
                  <Td><bdi dir="ltr">{r.date}</bdi></Td>
                  <Td><Badge tone={TONE[r.status]}>{pick(locale, LABEL[r.status].en, LABEL[r.status].ar)}</Badge></Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </PracticeFrame>
  );
}
