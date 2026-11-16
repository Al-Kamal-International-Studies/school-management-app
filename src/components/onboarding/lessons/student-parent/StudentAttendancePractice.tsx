"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { FakeTable, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { attendanceRate } from "@/lib/attendance/rate";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, TileButton, isoDate, tr } from "./shared";

type Status = "present" | "late" | "absent" | "excused";

const TONE: Record<Status, "green" | "amber" | "red" | "slate"> = { present: "green", late: "amber", absent: "red", excused: "slate" };

// Newest first, like the real page. One late day, one absent day, one excused day.
const DAYS: { offset: number; status: Status }[] = [
  { offset: -1, status: "present" },
  { offset: -2, status: "present" },
  { offset: -3, status: "present" },
  { offset: -4, status: "late" },
  { offset: -5, status: "present" },
  { offset: -6, status: "present" },
  { offset: -7, status: "excused" },
  { offset: -8, status: "present" },
  { offset: -9, status: "absent" },
  { offset: -10, status: "present" },
  { offset: -11, status: "present" },
  { offset: -12, status: "present" },
];

export default function StudentAttendancePractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(9000);
  const [filter, setFilter] = useState<Status | null>(null);

  const records = useMemo(() => DAYS.map((d) => ({ date: isoDate(d.offset), status: d.status })), []);
  const rate = attendanceRate(records);
  const count = (s: Status) => records.filter((r) => r.status === s).length;
  const label: Record<Status, string> = {
    present: tr(locale, "Present", "حاضر"),
    late: tr(locale, "Late", "متأخر"),
    absent: tr(locale, "Absent", "غائب"),
    excused: tr(locale, "Excused", "معذور"),
  };
  const shown = filter ? records.filter((r) => r.status === filter) : records;

  function pickRow(r: { date: string; status: Status }) {
    if (r.status === "late") {
      completeTask("late");
      show(tr(locale, `Yes. You were late on ${r.date}.`, `صحيح. تأخرت في يوم ${r.date}.`));
    } else if (r.status === "absent") {
      completeTask("absent");
      show(tr(locale, `Yes. You were absent on ${r.date}.`, `صحيح. غبت في يوم ${r.date}.`));
    } else {
      show(
        tr(
          locale,
          `On ${r.date} the status is ${label[r.status]}. Press the Late or Absent tile to show only those days.`,
          `حالة يوم ${r.date} هي «${label[r.status]}». اضغط على بطاقة «متأخر» أو «غائب» لعرض تلك الأيام فقط.`,
        ),
        "info",
      );
    }
  }

  function explainRate() {
    completeTask("rate");
    const counted = records.filter((r) => r.status !== "excused");
    const attended = counted.filter((r) => r.status === "present" || r.status === "late").length;
    show(
      tr(
        locale,
        `Your rate counts Present and Late days as attended: ${attended} out of ${counted.length} days = ${rate}%. Excused days are left out. An absent day lowers it.`,
        `تحسب النسبة الأيام الحاضرة والمتأخرة على أنها حضور: ${attended} من ${counted.length} يومًا = ${rate}%. الأيام المعذورة لا تدخل في الحساب، واليوم الغائب يخفض النسبة.`,
      ),
      "info",
    );
  }

  function toggle(s: Status) {
    setFilter((f) => (f === s ? null : s));
  }

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={tr(locale, "Attendance", "الحضور")}
      description={tr(locale, "Attendance History", "سجل الحضور")}
    >
      {toast}
      <p className="text-xs text-slate-500 dark:text-navy-400">
        {tr(
          locale,
          "Only you, your parents and the school can see your attendance. Other students cannot.",
          "أنت وولي أمرك والمدرسة فقط يمكنكم رؤية حضورك. أما الطلاب الآخرون فلا يرونه.",
        )}
      </p>
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "late", text: tr(locale, "Press the Late tile, then press the day that is shown.", "اضغط على بطاقة «متأخر»، ثم اضغط على اليوم الظاهر.") },
          { id: "absent", text: tr(locale, "Press the Absent tile, then press the day that is shown.", "اضغط على بطاقة «غائب»، ثم اضغط على اليوم الظاهر.") },
          { id: "rate", text: tr(locale, "Press the Attendance tile.", "اضغط على بطاقة «الحضور».") },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <TileButton label={tr(locale, "Attendance", "الحضور")} value={rate !== null ? `${rate}%` : "—"} onPress={explainRate} />
        {(["present", "late", "absent", "excused"] as Status[]).map((s) => (
          <TileButton key={s} label={label[s]} value={count(s)} pressed={filter === s} onPress={() => toggle(s)} />
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-navy-400" aria-live="polite">
        {filter
          ? tr(locale, `Showing only ${label[filter]} days. Press the tile again to show all days.`, `يُعرض فقط أيام «${label[filter]}». اضغط على البطاقة مرة أخرى لعرض كل الأيام.`)
          : tr(locale, "Press a tile to show only those days.", "اضغط على بطاقة لعرض تلك الأيام فقط.")}
      </p>

      <FakeTable
        head={[tr(locale, "Date", "التاريخ"), tr(locale, "Status", "الحالة")]}
        rows={shown.map((r) => ({
          key: r.date,
          cells: [
            <button
              key="d"
              type="button"
              onClick={() => pickRow(r)}
              className="tabular -mx-1 rounded px-1 font-medium text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-white"
            >
              <bdi dir="ltr">{r.date}</bdi>
            </button>,
            <Badge key="s" tone={TONE[r.status]}>
              {label[r.status]}
            </Badge>,
          ],
        }))}
      />
    </PracticeFrame>
  );
}
