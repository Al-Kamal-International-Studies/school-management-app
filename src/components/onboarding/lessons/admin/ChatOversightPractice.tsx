"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, ResponsiveTable } from "./common";

const T = {
  en: {
    title: "Chat oversight",
    subtitle: "Every private chat and subject group in the school, read-only. Opening a chat here leaves no read receipt.",
    head: ["Between", "Last message", ""],
    group: "Subject group",
    open: "Open",
    back: "Back to chats",
    readOnly: "Oversight view: read-only. Your visit doesn't show as read.",
    chats: [
      { between: "Ms. Teacher One and Mrs. Sample", last: "Thank you, see you on Thursday.", group: false, msgs: ["Hello, Omar did well in the maths quiz.", "Thank you, see you on Thursday."] },
      { between: "Mathematics, Practice Class 7A", last: "Homework is on page 12.", group: true, msgs: ["Please read page 12 tonight.", "Homework is on page 12."] },
    ],
    guide: "Open one private chat and one subject group. These are made-up chats.",
    why: "Only the oversight account sees this page. Other admins can't read whole chats, so no one else sees a chat they are not part of.",
  },
  ar: {
    title: "الإشراف على المحادثات",
    subtitle: "كل المحادثات الخاصة ومجموعات المواد في المدرسة، للقراءة فقط. فتح محادثة من هنا لا يظهر كقراءة.",
    head: ["بين", "آخر رسالة", ""],
    group: "مجموعة مادة",
    open: "فتح",
    back: "العودة إلى المحادثات",
    readOnly: "عرض إشرافي للقراءة فقط. زيارتك لا تظهر كمقروءة.",
    chats: [
      { between: "الأستاذة معلمة أولى والسيدة نموذج", last: "شكرًا لك، نراكم يوم الخميس.", group: false, msgs: ["مرحبًا، أحسن عمر في اختبار الرياضيات القصير.", "شكرًا لك، نراكم يوم الخميس."] },
      { between: "الرياضيات، صف التدريب 7أ", last: "الواجب في الصفحة 12.", group: true, msgs: ["يرجى قراءة الصفحة 12 الليلة.", "الواجب في الصفحة 12."] },
    ],
    guide: "افتح محادثة خاصة واحدة ومجموعة مادة واحدة. هذه محادثات مختلقة.",
    why: "حساب الإشراف وحده يرى هذه الصفحة. بقية المسؤولين لا يستطيعون قراءة المحادثات الكاملة، فلا يرى أحد محادثة ليس طرفًا فيها.",
  },
};

export default function ChatOversightPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const chat = openIdx === null ? null : t.chats[openIdx];

  if (chat) {
    return (
      <PracticeFrame locale={locale} dir={dir} title={chat.between}>
        <LinkButton onClick={() => setOpenIdx(null)}>{t.back}</LinkButton>
        <Alert tone="info">{t.readOnly}</Alert>
        <ul className="space-y-2">
          {chat.msgs.map((m) => (
            <li key={m} className="max-w-md rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-navy-900">
              {m}
            </li>
          ))}
        </ul>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <ResponsiveTable
        head={t.head}
        rows={t.chats.map((c, i) => ({
          key: String(i),
          cells: [
            <span key="b" className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-white">
              {c.between}
              {c.group && <Badge tone="navy">{t.group}</Badge>}
            </span>,
            c.last,
            <Button
              key="o"
              type="button"
              variant="secondary"
              onClick={() => {
                setOpenIdx(i);
                completeTask(c.group ? "open-group" : "open-chat");
              }}
            >
              {t.open}
              <span className="sr-only"> {c.between}</span>
            </Button>,
          ],
        }))}
      />
      <p className="text-sm text-slate-600 dark:text-navy-200">{t.why}</p>
    </PracticeFrame>
  );
}
