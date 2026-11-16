"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, ResponsiveTable } from "./common";

const T = {
  en: {
    title: "Subjects",
    subtitle: "School-wide subject list used across classes and timetables.",
    subjectName: "Subject name",
    code: "Code",
    add: "Add",
    head: ["Name", "Code", ""],
    delete: "Delete",
    errDup: "A subject with this code already exists.",
    inUse: (n: string) =>
      `"${n}" can't be removed because it is still in use: 3 class assignment(s), 12 timetable period(s)... Removing it would permanently delete all of that.`,
    added: (n: string) => `${n} was added.`,
    removed: (n: string) => `${n} was removed. It was not used anywhere.`,
    guideAdd: 'Type a name such as "Art" and a code such as "ART", then press Add.',
    guideDelete: "Press Delete on Mathematics. It is in use, so the app refuses.",
  },
  ar: {
    title: "المواد",
    subtitle: "قائمة المواد الدراسية على مستوى المدرسة، مستخدمة عبر الفصول والجداول الزمنية.",
    subjectName: "اسم المادة",
    code: "الرمز",
    add: "إضافة",
    head: ["الاسم", "الرمز", ""],
    delete: "حذف",
    errDup: "توجد مادة بالرمز نفسه بالفعل.",
    inUse: (n: string) => `لا يمكن حذف «${n}» لأنها ما زالت مستخدمة: 3 تعيينات في الفصول، و12 حصة في الجدول الزمني... سيؤدي حذفها إلى حذف كل ذلك نهائيًا.`,
    added: (n: string) => `تمت إضافة ${n}.`,
    removed: (n: string) => `تم حذف ${n}. لم تكن مستخدمة في أي مكان.`,
    guideAdd: 'اكتب اسمًا مثل «Art» ورمزًا مثل «ART»، ثم اضغط «إضافة».',
    guideDelete: "اضغط «حذف» عند الرياضيات. هي مستخدمة، لذلك يرفض التطبيق.",
  },
};

interface Sub {
  id: string;
  name: string;
  code: string;
  inUse: boolean;
}

export default function SubjectsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [subjects, setSubjects] = useState<Sub[]>([
    { id: "m1", name: locale === "ar" ? "الرياضيات" : "Mathematics", code: "MATH", inUse: true },
    { id: "m2", name: locale === "ar" ? "العلوم" : "Science", code: "SCI", inUse: true },
  ]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);

  function add(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (subjects.some((s) => s.code === c)) return setMessage({ tone: "error", text: t.errDup });
    setSubjects((prev) => [...prev, { id: `n${prev.length}`, name: name.trim(), code: c, inUse: false }]);
    setMessage({ tone: "success", text: t.added(name.trim()) });
    setName("");
    setCode("");
    completeTask("add-subject");
  }

  function remove(s: Sub) {
    if (s.inUse) {
      setMessage({ tone: "error", text: t.inUse(s.name) });
      completeTask("delete-refused");
      return;
    }
    setSubjects((prev) => prev.filter((x) => x.id !== s.id));
    setMessage({ tone: "info", text: t.removed(s.name) });
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>
        {t.guideAdd} {t.guideDelete}
      </Guidance>
      <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Input label={t.subjectName} name="practice-sub-name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label={t.code} name="practice-sub-code" value={code} onChange={(e) => setCode(e.target.value)} required />
        <Button type="submit">{t.add}</Button>
      </form>
      {message && <Alert tone={message.tone === "error" ? "error" : message.tone === "success" ? "success" : "info"}>{message.text}</Alert>}
      <ResponsiveTable
        head={t.head}
        rows={subjects.map((s) => ({
          key: s.id,
          cells: [
            <span key="n" className="font-medium text-slate-900 dark:text-white">
              {s.name}
            </span>,
            <bdi key="c" dir="ltr">
              {s.code}
            </bdi>,
            <LinkButton key="d" danger onClick={() => remove(s)}>
              {t.delete}
              <span className="sr-only"> {s.name}</span>
            </LinkButton>,
          ],
        }))}
      />
    </PracticeFrame>
  );
}
