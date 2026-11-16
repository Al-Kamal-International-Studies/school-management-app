"use client";

import { useState, type FormEvent } from "react";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, SAVE_OK, STUDENT_TARGETS, nameOf, pick, studentById, subjectById, targetKey, targetLabel } from "./shared";

interface GradeRow {
  id: number;
  studentId: string;
  subjectId: string;
  assessment: string;
  obtained: string;
  total: string;
  term: string;
}

const TEXT = {
  title: { en: "Grades", ar: "الدرجات" },
  newGrade: { en: "Record Grade", ar: "تسجيل درجة" },
  target: { en: "Student — Subject", ar: "الطالب — المادة" },
  assessment: { en: "Assessment", ar: "التقييم" },
  obtained: { en: "Marks Obtained", ar: "الدرجة المحصلة" },
  total: { en: "Marks Total", ar: "الدرجة الكلية" },
  term: { en: "Term", ar: "الفصل الدراسي" },
  submit: { en: "Submit", ar: "إرسال" },
  none: { en: "No grades recorded yet.", ar: "لا توجد درجات مسجلة بعد." },
  student: { en: "Student", ar: "الطالب" },
  subject: { en: "Subject", ar: "المادة" },
  placeholder: { en: "Mid-term test", ar: "اختبار منتصف الفصل" },
  needAssessment: { en: "Assessment name is required.", ar: "اسم التقييم مطلوب." },
  needObtained: { en: "Enter the marks obtained (0 or more).", ar: "أدخل الدرجة المحصلة (0 أو أكثر)." },
  needTotal: { en: "Enter the total marks (greater than 0).", ar: "أدخل الدرجة الكلية (أكبر من 0)." },
  needTerm: { en: "Term is required.", ar: "الفصل الدراسي مطلوب." },
  exceed: { en: "Marks obtained cannot exceed marks total.", ar: "لا يمكن أن تزيد الدرجة المحصلة عن الدرجة الكلية." },
  seen: {
    en: "The student and their parents can now see this on their Grades page. Nobody is sent a notification.",
    ar: "يستطيع الطالب وأولياء أمره الآن رؤية هذه الدرجة في صفحة الدرجات. ولا يُرسَل إشعار لأحد.",
  },
  guide: {
    en: "Pick a student and subject, name the assessment, then enter the marks obtained out of the total. Try 60 out of 50 to see what the app says.",
    ar: "اختر الطالب والمادة، وسمِّ التقييم، ثم أدخل الدرجة المحصلة من الدرجة الكلية. جرّب 60 من 50 لترى ما يقوله التطبيق.",
  },
} as const;

export default function GradesPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const [target, setTarget] = useState(targetKey(STUDENT_TARGETS[0]!));
  const [assessment, setAssessment] = useState("");
  const [obtained, setObtained] = useState("");
  const [total, setTotal] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState<GradeRow[]>([]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const o = Number(obtained);
    const t = Number(total);
    if (!assessment.trim()) return setError(L("needAssessment"));
    if (obtained.trim() === "" || Number.isNaN(o) || o < 0) return setError(L("needObtained"));
    if (total.trim() === "" || Number.isNaN(t) || t <= 0) return setError(L("needTotal"));
    if (!term.trim()) return setError(L("needTerm"));
    if (o > t) {
      completeTask("exceed");
      return setError(L("exceed"));
    }
    const [studentId = "s1", subjectId = "m1"] = target.split(":");
    setRows((r) => [{ id: r.length + 1, studentId, subjectId, assessment: assessment.trim(), obtained, total, term: term.trim() }, ...r]);
    setError(null);
    setSaved(true);
    setAssessment("");
    setObtained("");
    setTotal("");
    completeTask("record");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")}>
      <Guide level={level}>{L("guide")}</Guide>
      <Card>
        <h4 className="mb-4 card-title">{L("newGrade")}</h4>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          {saved && (
            <>
              <Alert tone="success">{SAVE_OK[locale]}</Alert>
              <Alert tone="info">{L("seen")}</Alert>
            </>
          )}
          <Select label={L("target")} name="practice-grd-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {STUDENT_TARGETS.map((t) => (
              <option key={targetKey(t)} value={targetKey(t)}>{targetLabel(t, locale)}</option>
            ))}
          </Select>
          <Input
            label={L("assessment")}
            name="practice-grd-assessment"
            placeholder={L("placeholder")}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label={L("obtained")} name="practice-grd-obtained" type="number" min={0} step="0.1" inputMode="decimal" value={obtained} onChange={(e) => setObtained(e.target.value)} required />
            <Input label={L("total")} name="practice-grd-total" type="number" min={1} step="0.1" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} required />
            <Input label={L("term")} name="practice-grd-term" value={term} onChange={(e) => setTerm(e.target.value)} required />
          </div>
          <Button type="submit">{L("submit")}</Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{L("none")}</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{L("student")}</Th>
              <Th>{L("subject")}</Th>
              <Th>{L("assessment")}</Th>
              <Th>{L("obtained")}/{L("total")}</Th>
              <Th>{L("term")}</Th>
            </tr>
          </Thead>
          <Tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <Td className="font-medium text-slate-900 dark:text-white">{nameOf(studentById(g.studentId), locale)}</Td>
                <Td>{nameOf(subjectById(g.subjectId), locale)}</Td>
                <Td>{g.assessment}</Td>
                <Td><bdi dir="ltr">{g.obtained}/{g.total}</bdi></Td>
                <Td>{g.term}</Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PracticeFrame>
  );
}
