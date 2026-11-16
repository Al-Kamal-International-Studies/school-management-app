"use client";

import { useState, type FormEvent } from "react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, STUDENT_TARGETS, classById, isoMonth, nameOf, pick, studentById, subjectById, targetKey, targetLabel } from "./shared";

const FACTORS = [
  "attendance",
  "homework",
  "participation",
  "behaviour",
  "assessment",
  "understanding",
] as const;
type Factor = (typeof FACTORS)[number];

interface Entry {
  key: string;
  studentId: string;
  subjectId: string;
  classId: string;
  month: string;
  overall: number;
}

const TEXT = {
  title: { en: "Monthly Progress Entry", ar: "سجل التقدم الشهري" },
  newEntry: { en: "New Entry", ar: "سجل جديد" },
  target: { en: "Student — Subject", ar: "الطالب — المادة" },
  month: { en: "Month", ar: "الشهر" },
  attendance: { en: "Attendance %", ar: "نسبة الحضور %" },
  homework: { en: "Homework Completion", ar: "إنجاز الواجبات" },
  participation: { en: "Class Participation", ar: "المشاركة الصفية" },
  behaviour: { en: "Behaviour & Conduct", ar: "السلوك والانضباط" },
  assessment: { en: "Assessment Performance", ar: "أداء التقييمات" },
  understanding: { en: "Subject Understanding", ar: "فهم المادة" },
  comments: { en: "Teacher Comments", ar: "ملاحظات المعلم" },
  improvement: { en: "Improvement Priority Areas", ar: "مجالات الأولوية للتحسين" },
  submit: { en: "Submit", ar: "إرسال" },
  past: { en: "Past Entries", ar: "السجلات السابقة" },
  none: { en: "No progress entries yet.", ar: "لا توجد سجلات تقدم بعد." },
  student: { en: "Student", ar: "الطالب" },
  subject: { en: "Subject", ar: "المادة" },
  class: { en: "Class", ar: "الفصل" },
  overall: { en: "Overall Score", ar: "الدرجة الإجمالية" },
  saved: { en: "Progress entry saved.", ar: "تم حفظ سجل التقدم." },
  future: { en: "A progress report can't be filed for a future month.", ar: "لا يمكن تقديم تقرير تقدم لشهر في المستقبل." },
  chooseMonth: { en: "Choose a month (for example 2026-09).", ar: "اختر شهرًا (مثل 2026-09)." },
  range: { en: "Enter a number from 0 to 100.", ar: "أدخل رقمًا من 0 إلى 100." },
  seen: {
    en: "The student and their parents can read these scores and your comments. Other teachers cannot. Nobody is sent a notification.",
    ar: "يستطيع الطالب وأولياء أمره قراءة هذه الدرجات وملاحظاتك. ولا يستطيع المعلمون الآخرون ذلك. ولا يُرسَل إشعار لأحد.",
  },
  replaced: {
    en: "That student, subject and month already had an entry, so this one replaced it. There is one entry per student, subject and month.",
    ar: "كان لهذا الطالب والمادة والشهر سجل سابق، فحلّ هذا السجل محله. هناك سجل واحد لكل طالب ومادة وشهر.",
  },
  guide: {
    en: "Sample scores are filled in so you can try it quickly. Change them if you like, then press Submit. The overall score is the average of the six.",
    ar: "ملأنا درجات تجريبية لتجرّب بسرعة. غيّرها إن شئت ثم اضغط «إرسال». الدرجة الإجمالية هي متوسط الدرجات الست.",
  },
} as const;

const SAMPLE: Record<Factor, string> = { attendance: "92", homework: "85", participation: "78", behaviour: "90", assessment: "74", understanding: "80" };

export default function ProgressPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const thisMonth = isoMonth(0);
  const [target, setTarget] = useState(targetKey(STUDENT_TARGETS[0]!));
  const [month, setMonth] = useState(thisMonth);
  const [scores, setScores] = useState<Record<Factor, string>>(SAMPLE);
  const [comments, setComments] = useState("");
  const [improvement, setImprovement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ replaced: boolean } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  function monthLabel(m: string) {
    return new Date(`${m}-01T00:00:00`).toLocaleDateString(locale === "ar" ? "ar" : "en-US", { month: "long", year: "numeric" });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    if (!/^\d{4}-\d{2}$/.test(month)) return setError(L("chooseMonth"));
    if (month > thisMonth) {
      completeTask("future-month");
      return setError(L("future"));
    }
    const nums: number[] = [];
    for (const f of FACTORS) {
      const raw = scores[f];
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n) || n < 0 || n > 100) return setError(L("range"));
      nums.push(n);
    }
    const overall = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    const [studentId = "s1", subjectId = "m1", classId = "c1"] = target.split(":");
    const key = `${studentId}:${subjectId}:${month}`;
    const replaced = entries.some((x) => x.key === key);
    setEntries((list) => [{ key, studentId, subjectId, classId, month, overall }, ...list.filter((x) => x.key !== key)]);
    setError(null);
    setSaved({ replaced });
    completeTask(replaced ? "refile" : "submit");
  }

  const numberField = (f: Factor) => (
    <Input
      key={f}
      label={L(f)}
      name={`practice-prg-${f}`}
      type="number"
      min={0}
      max={100}
      step="0.1"
      inputMode="decimal"
      value={scores[f]}
      onChange={(e) => setScores((s) => ({ ...s, [f]: e.target.value }))}
      required
    />
  );

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")}>
      <Guide level={level}>{L("guide")}</Guide>
      <Card>
        <h4 className="mb-4 card-title">{L("newEntry")}</h4>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          {saved && (
            <>
              <Alert tone="success">{L("saved")}</Alert>
              <Alert tone="info">{saved.replaced ? `${L("replaced")} ${L("seen")}` : L("seen")}</Alert>
            </>
          )}
          <Select label={L("target")} name="practice-prg-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {STUDENT_TARGETS.map((t) => (
              <option key={targetKey(t)} value={targetKey(t)}>{targetLabel(t, locale)}</option>
            ))}
          </Select>
          <Input label={L("month")} name="practice-prg-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{FACTORS.map(numberField)}</div>
          <Textarea label={L("comments")} name="practice-prg-comments" value={comments} onChange={(e) => setComments(e.target.value)} />
          <Textarea label={L("improvement")} name="practice-prg-improvement" value={improvement} onChange={(e) => setImprovement(e.target.value)} />
          <Button type="submit">{L("submit")}</Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h4 className="section-title">{L("past")}</h4>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{L("none")}</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{L("student")}</Th>
                <Th>{L("subject")}</Th>
                <Th>{L("class")}</Th>
                <Th>{L("month")}</Th>
                <Th>{L("overall")}</Th>
              </tr>
            </Thead>
            <Tbody>
              {entries.map((x) => (
                <tr key={x.key}>
                  <Td className="font-medium text-slate-900 dark:text-white">{nameOf(studentById(x.studentId), locale)}</Td>
                  <Td>{nameOf(subjectById(x.subjectId), locale)}</Td>
                  <Td>{nameOf(classById(x.classId), locale)}</Td>
                  <Td>{monthLabel(x.month)}</Td>
                  <Td className="tabular">{x.overall}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </PracticeFrame>
  );
}
