"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect, ResponsiveTable } from "./common";

const T = {
  en: {
    title: "Classes",
    subtitle: "Sections, homeroom teachers, and enrollment.",
    head: ["Class", "Academic year", "Homeroom teacher", "Students", ""],
    open: "Open",
    createTitle: "Create class",
    createSub: 'e.g. "Grade 9" section "A".',
    className: "Class name",
    section: "Section",
    year: "Academic year",
    homeroom: "Homeroom teacher (optional)",
    none: "None",
    create: "Create class",
    errYear: "Academic year must look like 2026 or 2026-2027.",
    errDup: "A class with this name, section, and year already exists.",
    guideCreate: 'Try "Grade 9", section "A", year "2026-2027". Then try creating the very same class a second time to see the error.',
    back: "Back to classes",
    subjectTeachers: "Subject teachers",
    noSubjects: "No subjects assigned yet.",
    subject: "Subject",
    teacher: "Teacher",
    chooseSubject: "Choose subject",
    chooseTeacher: "Choose teacher",
    assign: "Assign",
    errSelect: "Select a subject and teacher.",
    assigned: (s: string, tn: string) => `${tn} now teaches ${s} in this class. A class chat for ${s} was created, and the teacher can now use attendance, assignments, exams, grades, remarks and progress for this class.`,
    removeNote: "Removing a subject teacher deletes that subject's class chat for this class, and the timetable keeps listing the old teacher until you change it.",
    guideAssign: "Choose a subject and a teacher, then press Assign.",
    tHead: ["Subject", "Teacher"],
    students: "Students",
  },
  ar: {
    title: "الفصول",
    subtitle: "الشعب، معلمو الفصل، والتسجيل.",
    head: ["الفصل", "العام الدراسي", "معلم الفصل", "الطلاب", ""],
    open: "فتح",
    createTitle: "إنشاء فصل",
    createSub: 'مثال: "الصف 9" شعبة "A".',
    className: "اسم الفصل",
    section: "الشعبة",
    year: "العام الدراسي",
    homeroom: "معلم الفصل (اختياري)",
    none: "بدون",
    create: "إنشاء فصل",
    errYear: "يجب أن يكون العام الدراسي بصيغة 2026 أو 2026-2027.",
    errDup: "يوجد فصل بالاسم والشعبة والعام الدراسي نفسها.",
    guideCreate: 'جرّب «Grade 9» والشعبة «A» والعام «2026-2027». ثم حاول إنشاء الفصل نفسه مرة ثانية لترى رسالة الخطأ.',
    back: "العودة إلى الفصول",
    subjectTeachers: "معلمو المواد",
    noSubjects: "لا توجد مواد مُسندة بعد.",
    subject: "المادة",
    teacher: "المعلم",
    chooseSubject: "اختر المادة",
    chooseTeacher: "اختر المعلم",
    assign: "تعيين",
    errSelect: "اختر مادة ومعلمًا.",
    assigned: (s: string, tn: string) => `أصبح ${tn} يدرّس ${s} في هذا الفصل. أُنشئت محادثة فصل لمادة ${s}، ويستطيع المعلم الآن استخدام الحضور والواجبات والاختبارات والدرجات والملاحظات والتقدم لهذا الفصل.`,
    removeNote: "إزالة معلم مادة تحذف محادثة الفصل الخاصة بتلك المادة، ويبقى الجدول الزمني يعرض المعلم القديم حتى تغيّره.",
    guideAssign: "اختر مادة ومعلمًا ثم اضغط «تعيين».",
    tHead: ["المادة", "المعلم"],
    students: "الطلاب",
  },
};

interface Cls {
  id: string;
  name: string;
  section: string;
  year: string;
  homeroom: string;
  students: number;
}

export default function ClassesPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [classes, setClasses] = useState<Cls[]>([
    { id: "k1", name: "Practice 7", section: "A", year: "2026-2027", homeroom: "t1", students: 4 },
  ]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");
  const [homeroom, setHomeroom] = useState("");
  const [error, setError] = useState<{ field: string; text: string } | null>(null);
  const [assignments, setAssignments] = useState<Record<string, { subject: string; teacher: string }[]>>({});
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignedMsg, setAssignedMsg] = useState<string | null>(null);

  const teacherName = (id: string) => {
    const x = FakePeople.teachers.find((p) => p.id === id);
    return x ? x[locale] : t.none;
  };

  function create(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}(-\d{4})?$/.test(year.trim())) return setError({ field: "year", text: t.errYear });
    const dup = classes.some(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.section.toLowerCase() === section.trim().toLowerCase() && c.year === year.trim(),
    );
    if (dup) return setError({ field: "dup", text: t.errDup });
    const created: Cls = { id: `k${classes.length + 1}`, name: name.trim(), section: section.trim(), year: year.trim(), homeroom, students: 0 };
    setClasses((prev) => [...prev, created]);
    setError(null);
    setName("");
    setSection("");
    setYear("");
    setHomeroom("");
    setOpenId(created.id);
    completeTask("create-class");
  }

  function assign(e: FormEvent) {
    e.preventDefault();
    if (!subject || !teacher || !openId) return setAssignError(t.errSelect);
    setAssignError(null);
    const subj = FakePeople.subjects.find((s) => s.id === subject)!;
    setAssignments((prev) => {
      const list = (prev[openId] ?? []).filter((a) => a.subject !== subject);
      return { ...prev, [openId]: [...list, { subject, teacher }] };
    });
    setAssignedMsg(t.assigned(subj[locale], teacherName(teacher)));
    setSubject("");
    setTeacher("");
    completeTask("assign-subject");
  }

  const open = classes.find((c) => c.id === openId);

  if (open) {
    const list = assignments[open.id] ?? [];
    return (
      <PracticeFrame locale={locale} dir={dir} title={`${open.name} - ${open.section}`} description={`${open.year}`}>
        <LinkButton
          onClick={() => {
            setOpenId(null);
            setAssignedMsg(null);
          }}
        >
          {t.back}
        </LinkButton>
        <Card className="space-y-4 p-5">
          <h4 className="section-title">{t.subjectTeachers}</h4>
          <Guidance level={level}>{t.guideAssign}</Guidance>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-navy-400">{t.noSubjects}</p>
          ) : (
            <ResponsiveTable
              head={t.tHead}
              rows={list.map((a) => ({
                key: a.subject,
                cells: [FakePeople.subjects.find((s) => s.id === a.subject)![locale], teacherName(a.teacher)],
              }))}
            />
          )}
          <form onSubmit={assign} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <NativeSelect
              label={t.subject}
              name="practice-cls-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              options={[{ value: "", label: t.chooseSubject }, ...FakePeople.subjects.map((s) => ({ value: s.id, label: s[locale] }))]}
            />
            <NativeSelect
              label={t.teacher}
              name="practice-cls-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              options={[{ value: "", label: t.chooseTeacher }, ...FakePeople.teachers.map((p) => ({ value: p.id, label: p[locale] }))]}
            />
            <Button type="submit">{t.assign}</Button>
          </form>
          {assignError && <p className="text-xs text-red-600 dark:text-red-400">{assignError}</p>}
          {assignedMsg && <Alert tone="success">{assignedMsg}</Alert>}
          <p className="text-sm text-slate-500 dark:text-navy-400">{t.removeNote}</p>
        </Card>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <ResponsiveTable
        head={t.head}
        rows={classes.map((c) => ({
          key: c.id,
          cells: [
            <span key="c" className="font-medium text-slate-900 dark:text-white">
              {c.name} - {c.section}
            </span>,
            c.year,
            teacherName(c.homeroom),
            String(c.students),
            <LinkButton key="o" onClick={() => setOpenId(c.id)}>
              {t.open}
              <span className="sr-only"> {c.name} - {c.section}</span>
            </LinkButton>,
          ],
        }))}
      />
      <Card className="space-y-4 p-5">
        <div>
          <h4 className="section-title">{t.createTitle}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{t.createSub}</p>
        </div>
        <Guidance level={level}>{t.guideCreate}</Guidance>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t.className} name="practice-cls-name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t.section} name="practice-cls-section" required value={section} onChange={(e) => setSection(e.target.value)} />
            <Input
              label={t.year}
              name="practice-cls-year"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026-2027"
              error={error?.field === "year" ? error.text : undefined}
            />
            <NativeSelect
              label={t.homeroom}
              name="practice-cls-homeroom"
              value={homeroom}
              onChange={(e) => setHomeroom(e.target.value)}
              options={[{ value: "", label: t.none }, ...FakePeople.teachers.map((p) => ({ value: p.id, label: p[locale] }))]}
            />
          </div>
          {error?.field === "dup" && <p className="text-xs text-red-600 dark:text-red-400">{error.text}</p>}
          <Button type="submit">{t.create}</Button>
        </form>
      </Card>
    </PracticeFrame>
  );
}
