"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { pick, type L } from "./l10n";

interface Doc {
  id: string;
  task: "everyone" | "yours";
  title: L;
  category: L;
  date: L;
  note: L;
}

const POLICY: Doc = {
  id: "policy",
  task: "everyone",
  title: { en: "Uniform policy", ar: "سياسة الزي المدرسي" },
  category: { en: "Policy", ar: "سياسة" },
  date: { en: "3 Nov 2026", ar: "3 نوفمبر 2026" },
  note: { en: "for everyone", ar: "للجميع" },
};

const DOCS: Record<Exclude<UserRole, "admin">, Doc[]> = {
  teacher: [
    POLICY,
    {
      id: "handbook",
      task: "yours",
      title: { en: "Staff handbook", ar: "دليل الموظفين" },
      category: { en: "General", ar: "عام" },
      date: { en: "1 Sep 2026", ar: "1 سبتمبر 2026" },
      note: { en: "for teachers only", ar: "للمعلمين فقط" },
    },
  ],
  student: [
    {
      id: "report",
      task: "yours",
      title: { en: "Term 1 report card", ar: "بطاقة تقرير الفصل الأول" },
      category: { en: "Report Card", ar: "بطاقة التقرير" },
      date: { en: "12 Nov 2026", ar: "12 نوفمبر 2026" },
      note: { en: "attached to you, so only you, your parents and admins can open it", ar: "مرتبط بك، لذلك لا يفتحه إلا أنت وأولياء أمرك والمدراء" },
    },
    POLICY,
  ],
  parent: [
    {
      id: "report",
      task: "yours",
      title: { en: "Term 1 report card: Omar Sample", ar: "بطاقة تقرير الفصل الأول: عمر نموذج" },
      category: { en: "Report Card", ar: "بطاقة التقرير" },
      date: { en: "12 Nov 2026", ar: "12 نوفمبر 2026" },
      note: { en: "attached to your child, so only you, your child and admins can open it", ar: "مرتبط بابنك، لذلك لا يفتحه إلا أنت وابنك والمدراء" },
    },
    POLICY,
    {
      id: "handbook",
      task: "everyone",
      title: { en: "Parents' handbook", ar: "دليل أولياء الأمور" },
      category: { en: "General", ar: "عام" },
      date: { en: "1 Sep 2026", ar: "1 سبتمبر 2026" },
      note: { en: "for parents", ar: "لأولياء الأمور" },
    },
  ],
};

const UI = {
  en: {
    title: "Documents",
    download: "Download",
    note: "Practice note: this one is",
    fake: "Practice only: nothing was downloaded. In the real app this opens the file in a new tab through a link that works for 60 seconds.",
    newHint: "Press Download on a document to try it.",
  },
  ar: {
    title: "المستندات",
    download: "تنزيل",
    note: "ملاحظة تدريبية: هذا المستند",
    fake: "للتدريب فقط: لم يُنزَّل شيء. في التطبيق الحقيقي يفتح هذا الزر الملف في تبويبة جديدة عبر رابط يعمل لمدة 60 ثانية.",
    newHint: "اضغط «تنزيل» على أحد المستندات لتجرّب.",
  },
} as const;

export default function DocumentsPractice({ role, locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const docs = DOCS[role === "admin" ? "teacher" : role];
  const { toast, show } = useFakeToast(8000);

  // A task is done by downloading the matching kind of document.
  function download(d: Doc) {
    completeTask(d.task === "yours" ? "yours" : "everyone");
    show(ui.fake, "info");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.title}>
      {level === "new" && <p className="text-sm text-slate-600 dark:text-navy-200">{ui.newHint}</p>}
      {toast}
      <ul className="space-y-3">
        {docs.map((d) => (
          <li key={d.id}>
            <Card className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-white">{pick(d.title, locale)}</p>
                  <Badge tone="navy">{pick(d.category, locale)}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{pick(d.date, locale)}</p>
                <p className="mt-1 text-xs italic text-slate-500 dark:text-navy-300">
                  {ui.note} {pick(d.note, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(d)}
                aria-label={`${ui.download}: ${pick(d.title, locale)}`}
                className="flex shrink-0 items-center gap-1.5 rounded text-sm font-medium text-navy-700 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-200 dark:hover:text-white"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {ui.download}
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </PracticeFrame>
  );
}
