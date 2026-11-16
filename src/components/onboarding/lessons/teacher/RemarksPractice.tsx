"use client";

import { useState, type FormEvent } from "react";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/Field";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, SAVE_OK, nameOf, pick, studentById } from "./shared";

interface Remark {
  id: number;
  studentId: string;
  text: string;
  date: string;
}
interface Behaviour {
  id: number;
  studentId: string;
  category: "positive" | "negative";
  text: string;
  date: string;
}

const TEXT = {
  title: { en: "Teacher Remarks & Behaviour Log", ar: "ملاحظات المعلمين وسجل السلوك" },
  newRemark: { en: "New Remark", ar: "ملاحظة جديدة" },
  newEntry: { en: "New Entry", ar: "سجل جديد" },
  student: { en: "Student", ar: "الطالب" },
  category: { en: "Category", ar: "الفئة" },
  positive: { en: "Positive", ar: "إيجابي" },
  negative: { en: "Negative", ar: "سلبي" },
  description: { en: "Description", ar: "الوصف" },
  submit: { en: "Submit", ar: "إرسال" },
  remarksTitle: { en: "Teacher Remarks", ar: "ملاحظات المعلمين" },
  behaviourTitle: { en: "Behaviour Log", ar: "سجل السلوك" },
  noRemarks: { en: "No remarks yet.", ar: "لا توجد ملاحظات بعد." },
  noEntries: { en: "No behaviour entries yet.", ar: "لا توجد سجلات سلوك بعد." },
  remarkRequired: { en: "Remark is required.", ar: "الملاحظة مطلوبة." },
  descRequired: { en: "Description is required.", ar: "الوصف مطلوب." },
  whoTitle: { en: "Who can read what you just saved", ar: "من يستطيع قراءة ما حفظته للتو" },
  whoStudent: { en: "{student}, the student", ar: "{student}، الطالب" },
  whoParentFallback: { en: "The student's parents", ar: "أولياء أمر الطالب" },
  whoAdmins: { en: "Admins", ar: "الإدارة" },
  whoNot: {
    en: "Other teachers cannot read it, only you can. Negative entries are shared in exactly the same way, so write only what you would say to the family.",
    ar: "لا يستطيع المعلمون الآخرون قراءتها، وأنت وحدك من يراها. وتُشارَك السجلات السلبية بالطريقة نفسها تمامًا، فاكتب فقط ما تقوله لأسرة الطالب.",
  },
  guide: {
    en: "Pick a student and write a remark, or log a behaviour entry as Positive or Negative. Press Submit. Both are shared with the student and their parents.",
    ar: "اختر طالبًا واكتب ملاحظة، أو سجّل سلوكًا إيجابيًا أو سلبيًا، ثم اضغط «إرسال». كلاهما يُشارَك مع الطالب وأولياء أمره.",
  },
} as const;

export default function RemarksPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar" : "en");
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [entries, setEntries] = useState<Behaviour[]>([]);

  const [rStudent, setRStudent] = useState("s1");
  const [rText, setRText] = useState("");
  const [rError, setRError] = useState<string | null>(null);
  const [rSaved, setRSaved] = useState(false);

  const [bStudent, setBStudent] = useState("s1");
  const [bCategory, setBCategory] = useState<"positive" | "negative">("positive");
  const [bText, setBText] = useState("");
  const [bError, setBError] = useState<string | null>(null);
  const [bSaved, setBSaved] = useState(false);

  const [shared, setShared] = useState<{ studentId: string; text: string } | null>(null);

  function submitRemark(e: FormEvent) {
    e.preventDefault();
    setBSaved(false);
    if (!rText.trim()) return setRError(L("remarkRequired"));
    setRemarks((r) => [{ id: r.length + 1, studentId: rStudent, text: rText.trim(), date: today }, ...r]);
    setShared({ studentId: rStudent, text: rText.trim() });
    setRError(null);
    setRSaved(true);
    setRText("");
    completeTask("remark");
  }

  function submitEntry(e: FormEvent) {
    e.preventDefault();
    setRSaved(false);
    if (!bText.trim()) return setBError(L("descRequired"));
    setEntries((r) => [{ id: r.length + 1, studentId: bStudent, category: bCategory, text: bText.trim(), date: today }, ...r]);
    setShared({ studentId: bStudent, text: bText.trim() });
    setBError(null);
    setBSaved(true);
    setBText("");
    completeTask("behaviour");
  }

  const studentOptions = FakePeople.students.map((s) => (
    <option key={s.id} value={s.id}>{nameOf(s, locale)}</option>
  ));

  const sharedStudent = shared ? studentById(shared.studentId) : null;
  const sharedParentId = shared ? FakePeople.parentOf[shared.studentId] : undefined;
  const sharedParent = sharedParentId ? FakePeople.parents.find((p) => p.id === sharedParentId) : undefined;

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")}>
      <Guide level={level}>{L("guide")}</Guide>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card>
          <h4 className="mb-4 card-title">{L("newRemark")}</h4>
          <form onSubmit={submitRemark} className="space-y-4" noValidate>
            {rError && <Alert tone="error">{rError}</Alert>}
            {rSaved && <Alert tone="success">{SAVE_OK[locale]}</Alert>}
            <Select label={L("student")} name="practice-rem-student" value={rStudent} onChange={(e) => setRStudent(e.target.value)}>
              {studentOptions}
            </Select>
            <Textarea label={L("newRemark")} name="practice-rem-text" value={rText} onChange={(e) => setRText(e.target.value)} required />
            <Button type="submit">{L("submit")}</Button>
          </form>
        </Card>
        <Card>
          <h4 className="mb-4 card-title">{L("newEntry")}</h4>
          <form onSubmit={submitEntry} className="space-y-4" noValidate>
            {bError && <Alert tone="error">{bError}</Alert>}
            {bSaved && <Alert tone="success">{SAVE_OK[locale]}</Alert>}
            <Select label={L("student")} name="practice-beh-student" value={bStudent} onChange={(e) => setBStudent(e.target.value)}>
              {studentOptions}
            </Select>
            <Select label={L("category")} name="practice-beh-category" value={bCategory} onChange={(e) => setBCategory(e.target.value as "positive" | "negative")}>
              <option value="positive">{L("positive")}</option>
              <option value="negative">{L("negative")}</option>
            </Select>
            <Textarea label={L("description")} name="practice-beh-text" value={bText} onChange={(e) => setBText(e.target.value)} required />
            <Button type="submit">{L("submit")}</Button>
          </form>
        </Card>
      </div>

      {shared && sharedStudent && (
        <section aria-labelledby="practice-rem-who" className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-sm text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100">
          <h4 id="practice-rem-who" className="font-semibold">{L("whoTitle")}</h4>
          <p className="mt-1 italic">“{shared.text}”</p>
          <ul className="mt-2 list-disc space-y-0.5 ps-5">
            <li>{L("whoStudent").replace("{student}", nameOf(sharedStudent, locale))}</li>
            <li>{sharedParent ? nameOf(sharedParent, locale) : L("whoParentFallback")}</li>
            <li>{L("whoAdmins")}</li>
          </ul>
          <p className="mt-2">{L("whoNot")}</p>
        </section>
      )}

      <div className="space-y-3">
        <h4 className="section-title">{L("remarksTitle")}</h4>
        {remarks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{L("noRemarks")}</p>
        ) : (
          <div className="space-y-2">
            {remarks.map((r) => (
              <Card key={r.id} className="p-4 text-sm">
                <p className="font-medium text-navy-900 dark:text-white">{nameOf(studentById(r.studentId), locale)}</p>
                <p className="mt-1 text-slate-600 dark:text-navy-200">{r.text}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{r.date}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="section-title">{L("behaviourTitle")}</h4>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{L("noEntries")}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((b) => (
              <Card key={b.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-navy-900 dark:text-white">{nameOf(studentById(b.studentId), locale)}</p>
                  <Badge tone={b.category === "positive" ? "green" : "red"}>{L(b.category)}</Badge>
                </div>
                <p className="mt-1 text-slate-600 dark:text-navy-200">{b.text}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{b.date}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PracticeFrame>
  );
}
