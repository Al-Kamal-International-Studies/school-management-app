"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect } from "./common";

type Audience = "all" | "teacher" | "student" | "parent";

const FILES: Record<string, { name: string; mb: number }> = {
  pdf: { name: "term-1-report.pdf", mb: 1.2 },
  docx: { name: "uniform-policy.docx", mb: 0.4 },
  exe: { name: "setup.exe", mb: 0.9 },
  big: { name: "big-scan.png", mb: 6 },
};

const T = {
  en: {
    title: "Documents",
    upload: "Upload Document",
    heading: "Title",
    category: "Category",
    categories: { admit: "Admit Card", report: "Report Card", certificate: "Certificate", policy: "Policy", general: "General" },
    audience: "Audience",
    audiences: { all: "Everyone", teacher: "Teachers", student: "Students", parent: "Parents" },
    forStudent: "For Student (optional)",
    anyStudent: "Not student-specific",
    file: "File (practice files, nothing is uploaded)",
    noFile: "No file chosen",
    fileOptions: { pdf: "term-1-report.pdf (PDF, 1.2 MB)", docx: "uniform-policy.docx (Word, 0.4 MB)", exe: "setup.exe (program, 0.9 MB)", big: "big-scan.png (PNG, 6 MB)" },
    hint: "PDF, Word, JPG or PNG, up to 4 MB.",
    submit: "Upload",
    errNoFile: "Choose a file to upload.",
    errSize: "File must be under 4MB.",
    errType: "Use a PDF, Word document, JPG, or PNG file.",
    list: "Documents",
    none: "No documents yet.",
    delete: "Delete",
    confirmDelete: "Delete this document?",
    yes: "Yes",
    cancel: "Cancel",
    visible: "Who can open this document",
    student: (n: string) => `${n}, their parents, and admins. Nobody else, whatever the audience says.`,
    general: (a: string) => `Admins, and people in the audience: ${a}.`,
    noNotice: "No notification is sent when you upload a document.",
    guide: "Upload one document for Parents. Then upload one for a single student. Last, pick setup.exe to see the refusal.",
  },
  ar: {
    title: "المستندات",
    upload: "رفع مستند",
    heading: "العنوان",
    category: "الفئة",
    categories: { admit: "بطاقة دخول", report: "بطاقة التقرير", certificate: "شهادة", policy: "سياسة", general: "عام" },
    audience: "الفئة المستهدفة",
    audiences: { all: "الجميع", teacher: "المعلمون", student: "الطلاب", parent: "أولياء الأمور" },
    forStudent: "لطالب محدد (اختياري)",
    anyStudent: "غير مخصص لطالب معين",
    file: "الملف (ملفات تدريبية، لا يُرفع شيء)",
    noFile: "لم يتم اختيار ملف",
    fileOptions: { pdf: "term-1-report.pdf (PDF، 1.2 ميغابايت)", docx: "uniform-policy.docx (وورد، 0.4 ميغابايت)", exe: "setup.exe (برنامج، 0.9 ميغابايت)", big: "big-scan.png (PNG، 6 ميغابايت)" },
    hint: "PDF أو وورد أو JPG أو PNG، حتى 4 ميغابايت.",
    submit: "رفع",
    errNoFile: "اختر ملفًا لرفعه.",
    errSize: "يجب أن يقل حجم الملف عن 4 ميغابايت.",
    errType: "استخدم ملف PDF أو مستند وورد أو صورة JPG أو PNG.",
    list: "المستندات",
    none: "لا توجد مستندات بعد.",
    delete: "حذف",
    confirmDelete: "هل تريد حذف هذا المستند؟",
    yes: "نعم",
    cancel: "إلغاء",
    visible: "من يستطيع فتح هذا المستند",
    student: (n: string) => `${n} وولي أمره والمسؤولون. لا أحد غيرهم، مهما كانت الفئة المستهدفة.`,
    general: (a: string) => `المسؤولون، وأفراد الفئة المستهدفة: ${a}.`,
    noNotice: "لا يُرسل أي إشعار عند رفع مستند.",
    guide: "ارفع مستندًا واحدًا لأولياء الأمور. ثم ارفع مستندًا لطالب واحد. أخيرًا اختر setup.exe لترى سبب الرفض.",
  },
};

interface Doc {
  id: string;
  title: string;
  category: string;
  audience: Audience;
  student: string;
  file: string;
}

export default function DocumentsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [audience, setAudience] = useState<Audience>("all");
  const [student, setStudent] = useState("");
  const [file, setFile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Doc | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  const studentName = (id: string) => FakePeople.students.find((s) => s.id === id)?.[locale] ?? "";

  function submit(e: FormEvent) {
    e.preventDefault();
    setLast(null);
    if (!file) return setError(t.errNoFile);
    const f = FILES[file];
    if (!f) return setError(t.errNoFile);
    if (!/\.(pdf|docx?|jpe?g|png)$/i.test(f.name)) {
      setError(t.errType);
      completeTask("refuse-bad-file");
      return;
    }
    if (f.mb > 4) return setError(t.errSize);
    setError(null);
    const d: Doc = { id: `d${docs.length}-${title}`, title: title.trim(), category, audience, student, file: f.name };
    setDocs((prev) => [d, ...prev]);
    setLast(d);
    setTitle("");
    setFile("");
    completeTask("upload-document");
    if (student) completeTask("upload-student-document");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title}>
      <Guidance level={level}>{t.guide}</Guidance>
      <Card className="space-y-4 p-5">
        <h4 className="section-title">{t.upload}</h4>
        <form onSubmit={submit} className="space-y-4">
          <Input label={t.heading} name="practice-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="grid gap-4 sm:grid-cols-3">
            <NativeSelect
              label={t.category}
              name="practice-doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={Object.entries(t.categories).map(([v, l]) => ({ value: v, label: l }))}
            />
            <NativeSelect
              label={t.audience}
              name="practice-doc-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              options={Object.entries(t.audiences).map(([v, l]) => ({ value: v, label: l }))}
            />
            <NativeSelect
              label={t.forStudent}
              name="practice-doc-student"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              options={[{ value: "", label: t.anyStudent }, ...FakePeople.students.map((s) => ({ value: s.id, label: s[locale] }))]}
            />
          </div>
          <NativeSelect
            label={t.file}
            name="practice-doc-file"
            value={file}
            onChange={(e) => setFile(e.target.value)}
            hint={t.hint}
            options={[{ value: "", label: t.noFile }, ...Object.entries(t.fileOptions).map(([v, l]) => ({ value: v, label: l }))]}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit">{t.submit}</Button>
        </form>
      </Card>

      {last && (
        <Alert tone="success">
          <p className="font-medium">
            {t.visible}: {last.title}
          </p>
          <p className="mt-1">{last.student ? t.student(studentName(last.student)) : t.general(t.audiences[last.audience])}</p>
          <p className="mt-1">{t.noNotice}</p>
        </Alert>
      )}

      <section aria-labelledby="practice-doc-list" className="space-y-2">
        <h4 id="practice-doc-list" className="section-title">
          {t.list}
        </h4>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
        ) : (
          <ul className="space-y-3">
            {docs.map((d) => (
              <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-slate-900 dark:text-white">{d.title}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-navy-400">
                    <Badge tone="navy">{t.categories[d.category as keyof typeof t.categories]}</Badge>
                    {d.student && <Badge tone="gold">{studentName(d.student)}</Badge>}
                    <span>{t.audiences[d.audience]}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {asking === d.id ? (
                    <span className="flex items-center gap-2">
                      <span>{t.confirmDelete}</span>
                      <LinkButton
                        danger
                        onClick={() => {
                          setDocs((prev) => prev.filter((x) => x.id !== d.id));
                          setAsking(null);
                        }}
                      >
                        {t.yes}
                      </LinkButton>
                      <LinkButton onClick={() => setAsking(null)}>{t.cancel}</LinkButton>
                    </span>
                  ) : (
                    <LinkButton danger onClick={() => setAsking(d.id)}>
                      {t.delete}
                      <span className="sr-only"> {d.title}</span>
                    </LinkButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PracticeFrame>
  );
}
