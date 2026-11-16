"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, LeaveForm, LeaveList, tr, type LeaveRow } from "./shared";

export default function StudentLeavePractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(8000);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  return (
    <PracticeFrame locale={locale} dir={dir} title={tr(locale, "Leave Requests", "طلبات الإجازة")}>
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          {
            id: "submit",
            text: tr(
              locale,
              "Choose tomorrow as the start date and a later day as the end date, write a short reason, then press Submit.",
              "اختر الغد تاريخًا للبدء ويومًا لاحقًا للانتهاء، واكتب سببًا قصيرًا، ثم اضغط «إرسال».",
            ),
          },
          {
            id: "date-error",
            text: tr(
              locale,
              "Choose a start date from three weeks ago, write any reason, then press Submit.",
              "اختر تاريخ بدء قبل ثلاثة أسابيع، واكتب أي سبب، ثم اضغط «إرسال».",
            ),
          },
        ]}
      />
      <Card className="p-5">
        <h4 className="mb-4 card-title">{tr(locale, "New Leave Request", "طلب إجازة جديد")}</h4>
        <LeaveForm
          locale={locale}
          onResult={(error, v) => {
            if (error === null) {
              completeTask("submit");
              setRows((r) => [{ id: r.length + 1, start: v.start, end: v.end, reason: v.reason.trim() }, ...r]);
              show(
                tr(
                  locale,
                  "Request added as Pending. In the real app an admin decides on it, and nobody is alerted when you submit.",
                  "أُضيف الطلب بحالة «قيد الانتظار». في التطبيق الحقيقي تقرر الإدارة فيه، ولا يُنبَّه أحد عند إرساله.",
                ),
                "info",
              );
            } else if (error === "startOld") {
              completeTask("date-error");
            }
          }}
        />
      </Card>
      <LeaveList locale={locale} rows={rows} />
    </PracticeFrame>
  );
}
