"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, ResponsiveTable } from "./common";

type Verdict = "harmful" | "ok" | null;

const T = {
  en: {
    title: "Message safety",
    subtitle:
      "Messages the safety filter stopped or found borderline. Blocked messages never reached anyone; flagged ones were delivered and need a look. Marking each one helps retrain the filter.",
    head: ["From", "Messages", "Why", "Harmful?"],
    blocked: "Blocked",
    flagged: "Flagged",
    harmful: "Harmful",
    ok: "Fine",
    markHarmful: "Mark harmful",
    markOk: "Mark fine",
    score: "Model score",
    reasons: { word: "word list", model: "model", self: "wellbeing concern" },
    delivered: "Delivered",
    notDelivered: "Not delivered",
    honest:
      "Every admin can read the full text of blocked and flagged messages here. This is the one window other admins have. Only the oversight account can read whole chats.",
    alertNote: "When the filter flags something, every admin gets an alert that names the sender but never shows the message text.",
    guide: "Mark the blocked message as Harmful. Then mark the harmless flagged message (the one about the exam) as Fine.",
    samples: [
      "You are a stupid fool and nobody likes you.",
      "Give me your snack or I will tell everyone your secret.",
      "I feel really sad lately and I can't focus on anything.",
      "That exam was a disaster, I could scream.",
    ],
    roles: ["Student", "Student", "Student", "Parent"],
    when: ["Today, 10:05", "Today, 09:20", "Yesterday, 15:40", "Yesterday, 12:10"],
  },
  ar: {
    title: "أمان الرسائل",
    subtitle:
      "رسائل أوقفها فلتر الأمان أو اعتبرها مشبوهة. الرسائل المحظورة لم تصل لأحد، أما المعلَّمة فقد وصلت وتحتاج إلى مراجعة. تحديد كل رسالة يساعد في إعادة تدريب الفلتر.",
    head: ["من", "الرسائل", "السبب", "ضارة؟"],
    blocked: "محظورة",
    flagged: "معلَّمة",
    harmful: "ضارة",
    ok: "سليمة",
    markHarmful: "تحديد كضارة",
    markOk: "تحديد كسليمة",
    score: "درجة النموذج",
    reasons: { word: "قائمة الكلمات", model: "النموذج", self: "قلق على السلامة النفسية" },
    delivered: "وصلت",
    notDelivered: "لم تصل",
    honest:
      "يستطيع كل مسؤول قراءة النص الكامل للرسائل المحظورة والمعلَّمة هنا. هذه هي النافذة الوحيدة المتاحة لبقية المسؤولين. أما المحادثات الكاملة فلا يقرؤها إلا حساب الإشراف.",
    alertNote: "عندما يعلّم الفلتر رسالة، يصل كل مسؤول تنبيه يذكر اسم المرسل لكنه لا يعرض نص الرسالة.",
    guide: "حدّد الرسالة المحظورة كـ«ضارة». ثم حدّد الرسالة المعلَّمة غير الضارة (المتعلقة بالاختبار) كـ«سليمة».",
    samples: [
      "أنت غبي ولا أحد يحبك.",
      "أعطني وجبتك الخفيفة وإلا سأخبر الجميع بسرّك.",
      "أشعر بحزن شديد هذه الأيام ولا أستطيع التركيز في أي شيء.",
      "كان الاختبار كارثة، أكاد أصرخ.",
    ],
    roles: ["طالب", "طالب", "طالب", "ولي أمر"],
    when: ["اليوم، 10:05", "اليوم، 09:20", "أمس، 15:40", "أمس، 12:10"],
  },
};

const ITEMS = [
  { id: "f1", sender: { en: "Omar Sample", ar: "عمر نموذج" }, blocked: true, reasons: ["word"] as const, score: null as number | null },
  { id: "f2", sender: { en: "Zain Practice", ar: "زين تدريب" }, blocked: false, reasons: ["model"] as const, score: 0.64 },
  { id: "f3", sender: { en: "Lina Sample", ar: "لينا نموذج" }, blocked: false, reasons: ["self"] as const, score: null },
  { id: "f4", sender: { en: "Mrs. Example", ar: "السيدة مثال" }, blocked: false, reasons: ["model"] as const, score: 0.58 },
];

export default function MessageSafetyPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});

  function mark(id: string, v: "harmful" | "ok") {
    setVerdicts((prev) => ({ ...prev, [id]: v }));
    completeTask(v === "harmful" ? "mark-harmful" : "mark-fine");
  }

  const btn = (id: string, v: "harmful" | "ok", label: string) => {
    const on = verdicts[id] === v;
    return (
      <button
        key={v}
        type="button"
        aria-pressed={on}
        onClick={() => mark(id, v)}
        className={cn(
          "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors",
          on
            ? v === "harmful"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-200 dark:hover:bg-white/5",
        )}
      >
        {on ? (v === "harmful" ? t.harmful : t.ok) : label}
      </button>
    );
  };

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <Alert tone="warning">{t.honest}</Alert>
      <ResponsiveTable
        head={t.head}
        rows={ITEMS.map((it, i) => ({
          key: it.id,
          cells: [
            <span key="f">
              <span className="block font-medium text-slate-900 dark:text-white">{it.sender[locale]}</span>
              <span className="block text-xs text-slate-500 dark:text-navy-400">
                {t.roles[i]} · {t.when[i]}
              </span>
            </span>,
            <bdi key="m" dir="auto" className="whitespace-pre-wrap break-words text-sm">
              {t.samples[i]}
            </bdi>,
            <span key="w" className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start">
              <Badge tone={it.blocked ? "red" : "amber"}>{it.blocked ? t.blocked : t.flagged}</Badge>
              <span className="text-xs text-slate-500 dark:text-navy-400">
                {it.reasons.map((r) => t.reasons[r]).join(", ")}
                {it.score != null && ` · ${t.score} ${it.score.toFixed(2)}`}
                {" · "}
                {it.blocked ? t.notDelivered : t.delivered}
              </span>
            </span>,
            <span key="h" className="flex gap-1.5">
              {btn(it.id, "harmful", t.markHarmful)}
              {btn(it.id, "ok", t.markOk)}
            </span>,
          ],
        }))}
      />
      <p className="text-sm text-slate-600 dark:text-navy-200">{t.alertNote}</p>
    </PracticeFrame>
  );
}
