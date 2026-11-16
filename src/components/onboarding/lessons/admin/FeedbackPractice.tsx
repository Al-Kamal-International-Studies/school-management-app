"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, ResponsiveTable } from "./common";

type Status = "new" | "reviewed" | "resolved";
type Cat = "technical" | "academic" | "suggestion";

const T = {
  en: {
    title: "Feedback Inbox",
    head: ["From", "Category", "Message", "Posted", "Status"],
    cats: { technical: "Technical Issue", academic: "Academic Issue", suggestion: "Suggestion" },
    status: { new: "New", reviewed: "Reviewed", resolved: "Resolved" },
    statusLabel: "Status of",
    roles: ["Teacher", "Parent", "Student"],
    items: [
      ["Page is slow", "The attendance page takes a long time to open on my phone."],
      ["Homework question", "Where can my child see last week's homework?"],
      ["Idea", "It would help to have a dark theme option."],
    ],
    posted: ["Today", "Yesterday", "3 days ago"],
    note: "Changing the status is the only thing you can do here. The sender is not notified, and you are not alerted when feedback arrives; check the Open feedback count on Overview.",
    guide: "Set one item to Reviewed and another to Resolved, using the Status menus.",
  },
  ar: {
    title: "صندوق الملاحظات",
    head: ["من", "الفئة", "الرسالة", "تاريخ النشر", "الحالة"],
    cats: { technical: "مشكلة تقنية", academic: "مشكلة أكاديمية", suggestion: "اقتراح" },
    status: { new: "جديد", reviewed: "تمت المراجعة", resolved: "تم الحل" },
    statusLabel: "حالة",
    roles: ["معلم", "ولي أمر", "طالب"],
    items: [
      ["الصفحة بطيئة", "تستغرق صفحة الحضور وقتًا طويلًا لتفتح على هاتفي."],
      ["سؤال عن الواجبات", "أين يستطيع ابني رؤية واجبات الأسبوع الماضي؟"],
      ["فكرة", "سيكون من المفيد توفير خيار للمظهر الداكن."],
    ],
    posted: ["اليوم", "أمس", "قبل 3 أيام"],
    note: "تغيير الحالة هو الإجراء الوحيد المتاح هنا. لا يُنبَّه المرسل، ولا يصلك تنبيه عند وصول ملاحظة؛ راقب عدد «ملاحظات مفتوحة» في النظرة العامة.",
    guide: "اجعل عنصرًا واحدًا «تمت المراجعة» وآخر «تم الحل» من قوائم الحالة.",
  },
};

const ROWS: { id: string; person: { en: string; ar: string }; cat: Cat }[] = [
  { id: "fb1", person: { en: "Ms. Teacher One", ar: "الأستاذة معلمة أولى" }, cat: "technical" },
  { id: "fb2", person: { en: "Mrs. Sample", ar: "السيدة نموذج" }, cat: "academic" },
  { id: "fb3", person: { en: "Maya Example", ar: "مايا مثال" }, cat: "suggestion" },
];
const TONE: Record<Cat, "red" | "navy" | "gold"> = { technical: "red", academic: "navy", suggestion: "gold" };

export default function FeedbackPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [status, setStatus] = useState<Record<string, Status>>({ fb1: "new", fb2: "new", fb3: "new" });

  function change(id: string, v: Status) {
    setStatus((p) => ({ ...p, [id]: v }));
    if (v === "reviewed") completeTask("mark-reviewed");
    if (v === "resolved") completeTask("mark-resolved");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title}>
      <Guidance level={level}>{t.guide}</Guidance>
      <ResponsiveTable
        head={t.head}
        rows={ROWS.map((r, i) => ({
          key: r.id,
          cells: [
            <span key="f">
              <span className="block font-medium text-slate-900 dark:text-white">{r.person[locale]}</span>
              <span className="block text-xs text-slate-500 dark:text-navy-400">{t.roles[i]}</span>
            </span>,
            <Badge key="c" tone={TONE[r.cat]}>
              {t.cats[r.cat]}
            </Badge>,
            <span key="m">
              <span className="block font-medium">{t.items[i]?.[0]}</span>
              <span className="block text-xs text-slate-500 dark:text-navy-400">{t.items[i]?.[1]}</span>
            </span>,
            t.posted[i],
            <select
              key="s"
              aria-label={`${t.statusLabel} ${r.person[locale]}`}
              value={status[r.id]}
              onChange={(e) => change(r.id, e.target.value as Status)}
              className="input h-9 py-1 text-sm"
            >
              {(Object.keys(t.status) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {t.status[s]}
                </option>
              ))}
            </select>,
          ],
        }))}
      />
      <p className="text-sm text-slate-600 dark:text-navy-200">{t.note}</p>
    </PracticeFrame>
  );
}
