"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, ResponsiveTable, at } from "./common";

type Status = "pending" | "approved" | "rejected";

const T = {
  en: {
    title: "Leave Requests",
    head: ["Student", "Start Date", "End Date", "Reason", "Status", ""],
    status: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
    approve: "Approve",
    reject: "Reject",
    confirmApprove: "Approve?",
    confirmReject: "Reject?",
    yes: "Yes",
    cancel: "Cancel",
    reasons: ["Family trip", "Medical appointment", "Family event"],
    guide: "Approve one request and reject another. Each button asks you to confirm first.",
    sent: "Sent to the student and every linked parent:",
    approvedTitle: "Leave request approved",
    rejectedTitle: "Leave request not approved",
    body: (a: string, b: string, ok: boolean) => `Leave from ${a} to ${b} was ${ok ? "approved" : "rejected"}.`,
    to: (n: string, p: string) => `To: ${n} and ${p}`,
  },
  ar: {
    title: "طلبات الإجازة",
    head: ["الطالب", "تاريخ البدء", "تاريخ الانتهاء", "السبب", "الحالة", ""],
    status: { pending: "قيد الانتظار", approved: "موافق عليه", rejected: "مرفوض" },
    approve: "موافقة",
    reject: "رفض",
    confirmApprove: "هل توافق؟",
    confirmReject: "هل ترفض؟",
    yes: "نعم",
    cancel: "إلغاء",
    reasons: ["رحلة عائلية", "موعد طبي", "مناسبة عائلية"],
    guide: "وافق على طلب واحد وارفض آخر. يطلب منك كل زر التأكيد أولًا.",
    sent: "أُرسل إلى الطالب وإلى كل ولي أمر مرتبط به:",
    approvedTitle: "تمت الموافقة على طلب الإجازة",
    rejectedTitle: "لم تتم الموافقة على طلب الإجازة",
    body: (a: string, b: string, ok: boolean) => `${ok ? "تمت الموافقة على" : "تم رفض"} الإجازة من ${a} إلى ${b}.`,
    to: (n: string, p: string) => `إلى: ${n} و${p}`,
  },
};

const TONE: Record<Status, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

const REQUESTS = [
  { id: "l1", s: 0, a: "2026-11-23", b: "2026-11-24", p: "p1" },
  { id: "l2", s: 1, a: "2026-11-25", b: "2026-11-25", p: "p2" },
  { id: "l3", s: 4, a: "2026-11-30", b: "2026-12-01", p: "p4" },
];

export default function LeavePractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [status, setStatus] = useState<Record<string, Status>>({ l1: "pending", l2: "pending", l3: "pending" });
  const [asking, setAsking] = useState<{ id: string; kind: "approved" | "rejected" } | null>(null);
  const [sentFor, setSentFor] = useState<{ id: string; kind: "approved" | "rejected" } | null>(null);

  function decide() {
    if (!asking) return;
    setStatus((prev) => ({ ...prev, [asking.id]: asking.kind }));
    setSentFor(asking);
    completeTask(asking.kind === "approved" ? "approve" : "reject");
    setAsking(null);
  }

  const sent = sentFor ? REQUESTS.find((r) => r.id === sentFor.id)! : null;
  const person = (list: { id: string; en: string; ar: string }[], id: string) => list.find((x) => x.id === id)![locale];

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title}>
      <Guidance level={level}>{t.guide}</Guidance>
      <ResponsiveTable
        head={t.head}
        rows={REQUESTS.map((r, i) => {
          const st = status[r.id] ?? "pending";
          const isAsking = asking?.id === r.id;
          return {
            key: r.id,
            cells: [
              <span key="s" className="font-medium text-slate-900 dark:text-white">
                {at(FakePeople.students, r.s)[locale]}
              </span>,
              <bdi key="a" dir="ltr">
                {r.a}
              </bdi>,
              <bdi key="b" dir="ltr">
                {r.b}
              </bdi>,
              at(t.reasons, i),
              <Badge key="st" tone={TONE[st]}>
                {t.status[st]}
              </Badge>,
              st !== "pending" ? null : isAsking ? (
                <span key="c" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{asking.kind === "approved" ? t.confirmApprove : t.confirmReject}</span>
                  <Button type="button" onClick={decide}>
                    {t.yes}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setAsking(null)}>
                    {t.cancel}
                  </Button>
                </span>
              ) : (
                <span key="c" className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAsking({ id: r.id, kind: "approved" })}>
                    {t.approve}
                    <span className="sr-only"> {at(FakePeople.students, r.s)[locale]}</span>
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setAsking({ id: r.id, kind: "rejected" })}>
                    {t.reject}
                    <span className="sr-only"> {at(FakePeople.students, r.s)[locale]}</span>
                  </Button>
                </span>
              ),
            ],
          };
        })}
      />
      {sent && sentFor && (
        <Alert tone={sentFor.kind === "approved" ? "success" : "info"}>
          <p className="font-medium">{t.sent}</p>
          <p className="mt-1 font-medium">{sentFor.kind === "approved" ? t.approvedTitle : t.rejectedTitle}</p>
          <p>{t.body(sent.a, sent.b, sentFor.kind === "approved")}</p>
          <p className="mt-1 text-xs opacity-80">{t.to(person(FakePeople.students, `s${sent.s + 1}`), person(FakePeople.parents, sent.p))}</p>
        </Alert>
      )}
    </PracticeFrame>
  );
}
