"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance } from "./common";

const T = {
  en: {
    title: "Audit Log",
    subtitle: "The latest 200 recorded actions. There is no filter or search; scan the list.",
    head: ["Actor", "Action", "Target", "When"],
    teacherNote: "The log includes teacher actions (attendance, grades, assignments and more), not only admin actions.",
    tasks: "Find these entries by pressing the row:",
    q: ["Who marked attendance?", "Which entry shows an account locked after three wrong passwords?"],
    sys: "System",
    admin: "Ms. Admin Sample",
    teacher: "Ms. Teacher One",
    rows: [
      ["create_student_account", "profiles · 3f9a1c2e…", "Today, 10:12"],
      ["mark_attendance", "attendance · 8b2d77a0…", "Today, 09:05"],
      ["approved_leave_request", "leave_requests · c41e90bb…", "Today, 08:40"],
      ["auto_deactivate_failed_logins", "profiles · 5d03aa17…", "Yesterday, 16:22"],
      ["admin_set_password", "profiles · e7710c3d…", "Yesterday, 11:48"],
    ],
    explain: [
      "An admin created a student account.",
      "A teacher marked attendance for a class.",
      "An admin approved a leave request.",
      "The system locked an account automatically after three wrong passwords.",
      "An admin set a new password on a user's page.",
    ],
    right: "Correct.",
    other: "That is not the one, but now you know what it records:",
    guide: "Press a row to see what it means. Find the attendance entry and the automatic lock entry.",
  },
  ar: {
    title: "سجل التدقيق",
    subtitle: "آخر 200 إجراء مسجَّل. لا يوجد فلتر أو بحث؛ تصفّح القائمة.",
    head: ["الفاعل", "الإجراء", "الهدف", "الوقت"],
    teacherNote: "يتضمن السجل إجراءات المعلمين (الحضور والدرجات والواجبات وغيرها)، لا إجراءات المسؤولين فقط.",
    tasks: "اعثر على هذين السجلين بالضغط على الصف:",
    q: ["من سجّل الحضور؟", "أي سجل يُظهر قفل حساب بعد ثلاث كلمات مرور خاطئة؟"],
    sys: "النظام",
    admin: "الأستاذة مديرة نموذج",
    teacher: "الأستاذة معلمة أولى",
    rows: [
      ["create_student_account", "profiles · 3f9a1c2e…", "اليوم، 10:12"],
      ["mark_attendance", "attendance · 8b2d77a0…", "اليوم، 09:05"],
      ["approved_leave_request", "leave_requests · c41e90bb…", "اليوم، 08:40"],
      ["auto_deactivate_failed_logins", "profiles · 5d03aa17…", "أمس، 16:22"],
      ["admin_set_password", "profiles · e7710c3d…", "أمس، 11:48"],
    ],
    explain: [
      "أنشأ مسؤول حساب طالب.",
      "سجّل معلم الحضور لأحد الفصول.",
      "وافق مسؤول على طلب إجازة.",
      "قفل النظام حسابًا تلقائيًا بعد ثلاث كلمات مرور خاطئة.",
      "عيّن مسؤول كلمة مرور جديدة من صفحة المستخدم.",
    ],
    right: "صحيح.",
    other: "ليس هذا هو المطلوب، لكن تعرف الآن ما الذي يسجله:",
    guide: "اضغط على صف لتعرف معناه. اعثر على سجل الحضور وسجل القفل التلقائي.",
  },
};

export default function AuditLogPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [picked, setPicked] = useState<number | null>(null);
  const actors = [t.admin, t.teacher, t.admin, t.sys, t.admin];

  function pick(i: number) {
    setPicked(i);
    if (i === 1) completeTask("find-teacher-action");
    if (i === 3) completeTask("find-lock");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <div className="text-sm text-slate-700 dark:text-navy-100">
        <p className="font-medium">{t.tasks}</p>
        <ul className="mt-1 list-disc ps-5">
          {t.q.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1fr_1.4fr_1.2fr_0.8fr] gap-3 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500 dark:bg-white/[0.03] dark:text-navy-300 sm:grid">
          {t.head.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-navy-800">
          {t.rows.map((r, i) => (
            <li key={r[0]}>
              <button
                type="button"
                aria-pressed={picked === i}
                onClick={() => pick(i)}
                className={cn(
                  "grid w-full gap-1 px-4 py-3 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5 sm:grid-cols-[1fr_1.4fr_1.2fr_0.8fr] sm:gap-3",
                  picked === i && "bg-navy-50 dark:bg-navy-500/15",
                )}
              >
                <span className="font-medium text-slate-900 dark:text-white">{actors[i]}</span>
                <span dir="ltr" className="text-start font-mono text-xs">
                  {r[0]}
                </span>
                <span dir="ltr" className="text-start text-xs text-slate-500 dark:text-navy-400">
                  {r[1]}
                </span>
                <span>{r[2]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {picked !== null && (
        <Alert tone={picked === 1 || picked === 3 ? "success" : "info"}>
          {picked === 1 || picked === 3 ? t.right : t.other} {t.explain[picked]}
        </Alert>
      )}
      <p className="text-sm text-slate-600 dark:text-navy-200">{t.teacherNote}</p>
    </PracticeFrame>
  );
}
