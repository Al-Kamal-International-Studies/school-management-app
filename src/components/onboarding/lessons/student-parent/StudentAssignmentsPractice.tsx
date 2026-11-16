"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, isoDate, tr } from "./shared";

type Status = "pending" | "submitted" | "graded";

interface Item {
  id: string;
  subject: (typeof FakePeople.subjects)[number];
  due: string;
  status: Status;
}

const INITIAL: Item[] = [
  { id: "a1", subject: FakePeople.subjects[0]!, due: isoDate(2), status: "pending" },
  { id: "a2", subject: FakePeople.subjects[1]!, due: isoDate(5), status: "pending" },
  { id: "a3", subject: FakePeople.subjects[2]!, due: isoDate(-3), status: "graded" },
];

export default function StudentAssignmentsPractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(8000);
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const copy: Record<string, { title: string; description: string }> = {
    a1: {
      title: tr(locale, "Fractions worksheet", "ورقة عمل الكسور"),
      description: tr(locale, "Complete questions 1 to 10 on page 42 of your workbook.", "أكمل الأسئلة من 1 إلى 10 في الصفحة 42 من كتاب التمارين."),
    },
    a2: {
      title: tr(locale, "Water cycle diagram", "رسم دورة الماء"),
      description: tr(locale, "Draw the water cycle and label every step.", "ارسم دورة الماء وسمِّ كل مرحلة."),
    },
    a3: {
      title: tr(locale, "Summer essay", "مقال عن الصيف"),
      description: tr(locale, "Write 200 words about your summer holiday.", "اكتب 200 كلمة عن إجازتك الصيفية."),
    },
  };
  const feedback = tr(locale, "Good ideas. Check your punctuation next time.", "أفكار جيدة. انتبه إلى علامات الترقيم في المرة القادمة.");
  const statusLabel: Record<Status, string> = {
    pending: tr(locale, "Pending", "معلّق"),
    submitted: tr(locale, "Submitted", "تم التسليم"),
    graded: tr(locale, "Graded", "تم التقييم"),
  };
  const statusTone: Record<Status, "slate" | "gold" | "green"> = { pending: "slate", submitted: "gold", graded: "green" };

  function toggle(item: Item) {
    const nowOpen = !open[item.id];
    setOpen((o) => ({ ...o, [item.id]: nowOpen }));
    if (!nowOpen) return;
    if (item.id === "a1") completeTask("open");
    if (item.id === "a3") completeTask("graded");
  }

  function submit(item: Item) {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, status: "submitted" } : i)));
    completeTask("submit");
    show(
      tr(
        locale,
        "Marked as submitted. In the real app your teacher sees this status when they open the assignment. Hand in your real work the way your teacher asks.",
        "تم تحديده كمُسلَّم. في التطبيق الحقيقي يرى معلمك هذه الحالة عندما يفتح الواجب. سلّم عملك الفعلي بالطريقة التي يطلبها معلمك.",
      ),
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={tr(locale, "My Assignments", "واجباتي")}>
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "open", text: tr(locale, "Press the title Fractions worksheet.", "اضغط على العنوان «ورقة عمل الكسور».") },
          { id: "submit", text: tr(locale, "Press Mark as Submitted.", "اضغط «تحديد كمُسلَّم».") },
          { id: "graded", text: tr(locale, "Press the title Summer essay and read the grade.", "اضغط على العنوان «مقال عن الصيف» واقرأ الدرجة.") },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((a) => {
          const isOpen = open[a.id] === true;
          const detailsId = `practice-assignment-${a.id}`;
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => toggle(a)}
                    aria-expanded={isOpen}
                    aria-controls={detailsId}
                    className="flex items-center gap-1.5 rounded text-start text-sm font-semibold text-navy-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-white"
                  >
                    {copy[a.id]!.title}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-navy-400">
                    {FakePeople.name(a.subject, locale)} · {tr(locale, "Due", "التسليم")} <bdi dir="ltr">{a.due}</bdi>
                  </p>
                </div>
                <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
              </div>
              <div id={detailsId} hidden={!isOpen}>
                <p className="mt-2 text-sm text-slate-600 dark:text-navy-200">{copy[a.id]!.description}</p>
                {a.status === "graded" && (
                  <p className="mt-3 text-sm font-medium text-navy-900 dark:text-white">
                    {tr(locale, "Grade", "الدرجة")}: 85
                    <span className="block text-xs font-normal text-slate-500 dark:text-navy-400">{feedback}</span>
                  </p>
                )}
                {a.status === "pending" && (
                  <div className="mt-3">
                    <Button type="button" variant="secondary" onClick={() => submit(a)}>
                      {tr(locale, "Mark as Submitted", "تحديد كمُسلَّم")}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </PracticeFrame>
  );
}
