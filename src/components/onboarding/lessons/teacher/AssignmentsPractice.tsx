"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import {
  Guide,
  ROSTER,
  SAVE_OK,
  TEACHES,
  classById,
  nameOf,
  pairKey,
  pairLabel,
  pick,
  studentById,
  subjectById,
} from "./shared";

type SubStatus = "pending" | "submitted" | "graded";
interface Sub {
  status: SubStatus;
  grade: string;
  feedback: string;
}
interface Assignment {
  id: string;
  title: string;
  description: string;
  due: string;
  classId: string;
  subjectId: string;
  subs: Record<string, Sub>;
}

const TEXT = {
  title: { en: "Assignments", ar: "الواجبات" },
  newAssignment: { en: "New Assignment", ar: "واجب جديد" },
  target: { en: "Class — Subject", ar: "الفصل — المادة" },
  titleLabel: { en: "Title", ar: "العنوان" },
  description: { en: "Description", ar: "الوصف" },
  dueDate: { en: "Due Date", ar: "تاريخ التسليم" },
  submit: { en: "Submit", ar: "إرسال" },
  class: { en: "Class", ar: "الفصل" },
  subject: { en: "Subject", ar: "المادة" },
  none: { en: "No assignments yet.", ar: "لا توجد واجبات بعد." },
  titleRequired: { en: "Title is required.", ar: "العنوان مطلوب." },
  dueRequired: { en: "Due date is required.", ar: "تاريخ التسليم مطلوب." },
  gradeRange: { en: "Enter a grade between 0 and 100.", ar: "أدخل درجة بين 0 و100." },
  notified: {
    en: "Every student in the class gets a notification: “New assignment: {title}”. Parents are not notified.",
    ar: "يصل إلى كل طالب في الفصل إشعار: «واجب جديد: {title}». ولا يُرسَل إشعار لأولياء الأمور.",
  },
  back: { en: "Back to assignments", ar: "العودة إلى الواجبات" },
  due: { en: "Due", ar: "التسليم" },
  grade: { en: "Grade", ar: "الدرجة" },
  feedback: { en: "Feedback", ar: "الملاحظات" },
  save: { en: "Save", ar: "حفظ" },
  pending: { en: "Pending", ar: "معلّق" },
  submitted: { en: "Submitted", ar: "تم التسليم" },
  graded: { en: "Graded", ar: "تم التقييم" },
  guideCreate: {
    en: "Fill in a title and a due date, then press Submit. Then open the assignment from the list to grade what students handed in.",
    ar: "اكتب عنوانًا وتاريخ تسليم ثم اضغط «إرسال». بعدها افتح الواجب من القائمة لتقييم ما سلّمه الطلاب.",
  },
  guideGrade: {
    en: "Type a grade from 0 to 100 and a short feedback line, then press Save on that student's row. The status chip changes to Graded. The student is not notified of the grade.",
    ar: "اكتب درجة من 0 إلى 100 وسطر ملاحظات قصيرًا، ثم اضغط «حفظ» في صف الطالب. تتحول الحالة إلى «تم التقييم». ولا يُرسَل إشعار للطالب بالدرجة.",
  },
} as const;

const STATUS_LABEL = (s: SubStatus) => TEXT[s];
const STATUS_TONE: Record<SubStatus, "slate" | "gold" | "green"> = { pending: "slate", submitted: "gold", graded: "green" };

function GradeRow({
  locale,
  studentId,
  enrollment,
  sub,
  onSave,
}: {
  locale: PracticeProps["locale"];
  studentId: string;
  enrollment: string;
  sub: Sub;
  onSave: (grade: string, feedback: string) => string | null;
}) {
  const [grade, setGrade] = useState(sub.grade);
  const [feedback, setFeedback] = useState(sub.feedback);
  const [error, setError] = useState<string | null>(null);
  const name = nameOf(studentById(studentId), locale);
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(onSave(grade, feedback));
  }

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-navy-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
        <p className="text-xs text-slate-400 dark:text-navy-500"><bdi>{enrollment}</bdi></p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[sub.status]}>{pick(locale, STATUS_LABEL(sub.status).en, STATUS_LABEL(sub.status).ar)}</Badge>
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2" noValidate>
        {error && <span role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{error}</span>}
        <input
          type="number"
          aria-label={`${L("grade")}: ${name}`}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          min={0}
          max={100}
          step="0.1"
          placeholder={L("grade")}
          className="input w-24 py-1.5 text-sm"
        />
        <input
          type="text"
          aria-label={`${L("feedback")}: ${name}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={L("feedback")}
          className="input w-40 py-1.5 text-sm"
        />
        <Button type="submit" variant="secondary" className="shrink-0">{L("save")}</Button>
      </form>
    </div>
  );
}

export default function AssignmentsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const [target, setTarget] = useState(pairKey(TEACHES[0]!));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = items.find((a) => a.id === openId) ?? null;

  function create(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    if (!title.trim()) return setError(L("titleRequired"));
    if (!due) return setError(L("dueRequired"));
    const [classId = "c1", subjectId = "m1"] = target.split(":");
    const subs: Record<string, Sub> = {};
    (ROSTER[classId] ?? []).forEach((s, i) => {
      subs[s.id] = { status: i < 2 ? "submitted" : "pending", grade: "", feedback: "" };
    });
    const a: Assignment = { id: `a${items.length + 1}`, title: title.trim(), description, due, classId, subjectId, subs };
    setItems((list) => [a, ...list]);
    setError(null);
    setSaved(L("notified").replace("{title}", a.title));
    setTitle("");
    setDescription("");
    setDue("");
    completeTask("create");
  }

  function saveGrade(a: Assignment, studentId: string, grade: string, feedback: string): string | null {
    const g = Number(grade);
    if (grade.trim() === "" || Number.isNaN(g) || g < 0 || g > 100) return L("gradeRange");
    setItems((list) =>
      list.map((x) => (x.id === a.id ? { ...x, subs: { ...x.subs, [studentId]: { status: "graded", grade, feedback } } } : x)),
    );
    completeTask("grade");
    return null;
  }

  if (open) {
    return (
      <PracticeFrame locale={locale} dir={dir}>
        <div className="space-y-5">
          <button type="button" onClick={() => setOpenId(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:underline dark:text-navy-200">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {L("back")}
          </button>
          <div>
            <h3 className="page-title-compact">{open.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{L("due")} <bdi dir="ltr">{open.due}</bdi></p>
            {open.description && <p className="mt-3 text-sm text-slate-600 dark:text-navy-200">{open.description}</p>}
          </div>
          <Guide level={level}>{L("guideGrade")}</Guide>
          <Card>
            {(ROSTER[open.classId] ?? []).map((s) => (
              <GradeRow
                key={s.id}
                locale={locale}
                studentId={s.id}
                enrollment={s.enrollment}
                sub={open.subs[s.id]!}
                onSave={(grade, feedback) => saveGrade(open, s.id, grade, feedback)}
              />
            ))}
          </Card>
        </div>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")}>
      <Guide level={level}>{L("guideCreate")}</Guide>
      <Card>
        <h4 className="mb-4 card-title">{L("newAssignment")}</h4>
        <form onSubmit={create} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          {saved && (
            <>
              <Alert tone="success">{SAVE_OK[locale]}</Alert>
              <Alert tone="info">{saved}</Alert>
            </>
          )}
          <Select label={L("target")} name="practice-asg-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {TEACHES.map((p) => (
              <option key={pairKey(p)} value={pairKey(p)}>{pairLabel(p, locale)}</option>
            ))}
          </Select>
          <Input label={L("titleLabel")} name="practice-asg-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label={L("description")} name="practice-asg-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label={L("dueDate")} name="practice-asg-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
          <Button type="submit">{L("submit")}</Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{L("none")}</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{L("titleLabel")}</Th>
              <Th>{L("class")}</Th>
              <Th>{L("subject")}</Th>
              <Th>{L("dueDate")}</Th>
            </tr>
          </Thead>
          <Tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium text-slate-900 dark:text-white">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(a.id);
                      completeTask("open");
                    }}
                    className="text-start underline-offset-2 hover:text-navy-600 hover:underline dark:hover:text-white"
                  >
                    {a.title}
                  </button>
                </Td>
                <Td>{nameOf(classById(a.classId), locale)}</Td>
                <Td>{nameOf(subjectById(a.subjectId), locale)}</Td>
                <Td><bdi dir="ltr">{a.due}</bdi></Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PracticeFrame>
  );
}
