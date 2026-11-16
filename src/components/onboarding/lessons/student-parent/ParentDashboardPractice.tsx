"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ListCard, ListRow, ListRows, Section } from "@/components/ui/List";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, LeaveForm, LeaveList, PickRow, TileButton, isoDate, tr, type LeaveRow } from "./shared";

type Bi = { en: string; ar: string };
type Kind = "exam" | "quiz";

interface Child {
  id: string;
  cls: (typeof FakePeople.classes)[number];
  number: string;
  ring: number;
  attendance: number;
  assignments: { id: string; title: Bi; offset: number }[];
  exams: { id: string; title: Bi; kind: Kind; offset: number }[];
  grades: { id: string; assessment: Bi; subject: number; got: number; total: number }[];
  remarks: { id: string; text: Bi }[];
  behaviour: { id: string; category: "positive" | "negative"; text: Bi }[];
}

const KIDS: Child[] = [
  {
    id: "s1",
    cls: FakePeople.classes[0]!,
    number: "2101",
    ring: 78.5,
    attendance: 88.2,
    assignments: [{ id: "a1", title: { en: "Fractions worksheet", ar: "ورقة عمل الكسور" }, offset: 2 }],
    exams: [{ id: "e1", title: { en: "Mathematics exam", ar: "اختبار الرياضيات" }, kind: "exam", offset: 10 }],
    grades: [
      { id: "g1", assessment: { en: "Midterm", ar: "اختبار منتصف الفصل" }, subject: 0, got: 14, total: 20 },
      { id: "g2", assessment: { en: "Lab report", ar: "تقرير المختبر" }, subject: 1, got: 12, total: 20 },
    ],
    remarks: [{ id: "r1", text: { en: "Omar takes part well in class discussions.", ar: "يشارك عمر جيدًا في نقاشات الصف." } }],
    behaviour: [{ id: "b1", category: "positive", text: { en: "Helped tidy the science lab.", ar: "ساعد في ترتيب مختبر العلوم." } }],
  },
  {
    id: "s2",
    cls: FakePeople.classes[1]!,
    number: "2102",
    ring: 91,
    attendance: 95.5,
    assignments: [
      { id: "a2", title: { en: "Reading log", ar: "سجل القراءة" }, offset: 3 },
      { id: "a3", title: { en: "Water cycle diagram", ar: "رسم دورة الماء" }, offset: 5 },
    ],
    exams: [{ id: "e2", title: { en: "Science quiz", ar: "مذاكرة العلوم" }, kind: "quiz", offset: 4 }],
    grades: [
      { id: "g3", assessment: { en: "Lab report", ar: "تقرير المختبر" }, subject: 1, got: 19, total: 20 },
      { id: "g4", assessment: { en: "Essay", ar: "مقال" }, subject: 2, got: 17, total: 20 },
      { id: "g5", assessment: { en: "Quiz 1", ar: "مذاكرة 1" }, subject: 0, got: 9, total: 10 },
    ],
    remarks: [{ id: "r2", text: { en: "Lina reads very well. She should check her spelling.", ar: "تقرأ لينا بشكل ممتاز، وعليها مراجعة إملائها." } }],
    behaviour: [
      { id: "b2", category: "negative", text: { en: "Did not hand in homework twice this week.", ar: "لم تسلّم الواجب مرتين هذا الأسبوع." } },
      { id: "b3", category: "positive", text: { en: "Helped a new classmate settle in.", ar: "ساعدت زميلة جديدة على التأقلم." } },
    ],
  },
];

export default function ParentDashboardPractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(9000);
  const [activeId, setActiveId] = useState("s1");
  const [leave, setLeave] = useState<Record<string, LeaveRow[]>>({});

  const child = KIDS.find((k) => k.id === activeId)!;
  const student = FakePeople.students.find((s) => s.id === activeId)!;
  const childName = FakePeople.name(student, locale);
  const isLina = activeId === "s2";

  const switchFirst = tr(
    locale,
    "You are looking at Omar's page. The Dashboard shows one child at a time, so switch to Lina first.",
    "أنت تنظر إلى صفحة عمر. تعرض لوحة التحكم طفلًا واحدًا في كل مرة، لذا انتقل إلى لينا أولًا.",
  );
  const subjectName = (i: number) => FakePeople.name(FakePeople.subjects[i]!, locale);

  function choose(id: string) {
    setActiveId(id);
    if (id === "s2") {
      completeTask("switch");
      show(tr(locale, "The whole page now shows Lina.", "تعرض الصفحة كلها الآن لينا."), "info");
    }
  }

  const rowsOf = leave[activeId] ?? [];

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={childName}
      description={`${FakePeople.name(child.cls, locale)} · #${child.number}`}
      action={
        <nav aria-label={tr(locale, "My Children", "أبنائي")} className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-navy-700 dark:bg-navy-900">
          {KIDS.map((k) => {
            const s = FakePeople.students.find((x) => x.id === k.id)!;
            const label = FakePeople.name(s, locale);
            const selected = k.id === activeId;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => choose(k.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md ps-1.5 pe-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500",
                  selected
                    ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                    selected ? "bg-white/15 dark:bg-navy-950/10" : "bg-slate-100 dark:bg-navy-800",
                  )}
                  aria-hidden="true"
                >
                  {label.charAt(0)}
                </span>
                {label}
              </button>
            );
          })}
        </nav>
      }
    >
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "switch", text: tr(locale, "Press Lina Sample at the top of the page.", "اضغط على «لينا نموذج» أعلى الصفحة.") },
          { id: "attendance", text: tr(locale, "With Lina selected, press the Attendance card.", "بعد اختيار لينا، اضغط على بطاقة «الحضور».") },
          { id: "grade", text: tr(locale, "In Recent Grades, press the Science row.", "في «أحدث الدرجات»، اضغط على صف العلوم.") },
          { id: "remark", text: tr(locale, "Scroll to Behaviour Log and press the entry marked Negative.", "انزل إلى «سجل السلوك» واضغط على السجل المكتوب عليه «سلبي».") },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h4 className="card-title">{tr(locale, "Academic Progress", "التقدم الأكاديمي")}</h4>
          <div className="mt-4">
            <ProgressRing key={activeId} value={child.ring} size={96} label={tr(locale, "Overall Score", "الدرجة الإجمالية")} />
          </div>
        </Card>
        <TileButton
          label={tr(locale, "Attendance", "الحضور")}
          value={`${child.attendance}%`}
          onPress={() => {
            if (!isLina) {
              show(switchFirst, "error");
              return;
            }
            completeTask("attendance");
            show(
              tr(
                locale,
                `Lina's attendance is ${child.attendance}%. Late days count as attended and excused days are left out.`,
                `نسبة حضور لينا ${child.attendance}%. الأيام المتأخرة تُحسب حضورًا والأيام المعذورة لا تدخل في الحساب.`,
              ),
            );
          }}
        />
      </div>

      <Section id="practice-parent-assignments" title={tr(locale, "Upcoming Assignments", "الواجبات القادمة")}>
        <ListCard>
          <ListRows>
            {child.assignments.map((a) => (
              <ListRow
                key={a.id}
                title={a.title[locale]}
                trailing={
                  <span className="tabular shrink-0 text-xs text-slate-500 dark:text-navy-400">
                    <bdi dir="ltr">{isoDate(a.offset)}</bdi>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-exams" title={tr(locale, "Upcoming Exams", "الاختبارات القادمة")}>
        <ListCard>
          <ListRows>
            {child.exams.map((e) => (
              <ListRow
                key={e.id}
                title={e.title[locale]}
                trailing={
                  <span className="flex shrink-0 items-center gap-3">
                    <Badge tone="navy">{e.kind === "quiz" ? tr(locale, "Quiz", "مذاكرة") : tr(locale, "Exam", "اختبار")}</Badge>
                    <span className="tabular text-xs text-slate-500 dark:text-navy-400">
                      <bdi dir="ltr">{isoDate(e.offset)}</bdi>
                    </span>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-grades" title={tr(locale, "Recent Grades", "أحدث الدرجات")}>
        <ListCard>
          <ListRows>
            {child.grades.map((g) => (
              <PickRow
                key={g.id}
                chevron={false}
                onPick={() => {
                  if (!isLina) {
                    show(switchFirst, "error");
                    return;
                  }
                  const detail = tr(
                    locale,
                    `${subjectName(g.subject)}, ${g.assessment.en}: ${g.got} out of ${g.total}.`,
                    `${subjectName(g.subject)}، ${g.assessment.ar}: ${g.got} من ${g.total}.`,
                  );
                  if (g.subject === 1) {
                    completeTask("grade");
                    show(`${tr(locale, "Yes.", "صحيح.")} ${detail}`);
                  } else {
                    show(`${detail} ${tr(locale, "The task asks for the Science mark.", "المطلوب في المهمة هو درجة العلوم.")}`, "info");
                  }
                }}
                title={g.assessment[locale]}
                subtitle={subjectName(g.subject)}
                trailing={
                  <span className="tabular shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    <bdi dir="ltr">
                      {g.got}/{g.total}
                    </bdi>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-announcements" title={tr(locale, "Announcements", "الإعلانات")}>
        <ListCard>
          <ListRows>
            <li className="px-5 py-4">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{tr(locale, "Parents' evening", "أمسية أولياء الأمور")}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-navy-300">
                {tr(locale, "Parents are invited to meet the teachers on Thursday evening.", "ندعو أولياء الأمور للقاء المعلمين مساء الخميس.")}
              </p>
            </li>
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-remarks" title={tr(locale, "Teacher Remarks", "ملاحظات المعلمين")}>
        <ListCard>
          <ListRows>
            {child.remarks.map((r) => (
              <PickRow
                key={r.id}
                chevron={false}
                onPick={() =>
                  show(
                    tr(
                      locale,
                      "Teacher remarks are visible to you and to your child.",
                      "ملاحظات المعلمين مرئية لك ولطفلك.",
                    ),
                    "info",
                  )
                }
                title={<span className="font-normal text-slate-700 dark:text-navy-100">{r.text[locale]}</span>}
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-behaviour" title={tr(locale, "Behaviour Log", "سجل السلوك")}>
        <ListCard>
          <ListRows>
            {child.behaviour.map((b) => (
              <PickRow
                key={b.id}
                chevron={false}
                onPick={() => {
                  if (!isLina) {
                    show(switchFirst, "error");
                    return;
                  }
                  if (b.category === "negative") {
                    completeTask("remark");
                    show(
                      tr(
                        locale,
                        "Yes. Negative entries are shown to you, and to your child, just like positive ones.",
                        "صحيح. تظهر السجلات السلبية لك ولطفلك تمامًا مثل الإيجابية.",
                      ),
                    );
                  } else {
                    show(tr(locale, "This entry is Positive. Look for the one marked Negative.", "هذا السجل «إيجابي». ابحث عن السجل المكتوب عليه «سلبي»."), "info");
                  }
                }}
                title={
                  <span className="block">
                    <Badge tone={b.category === "positive" ? "green" : "red"}>
                      {b.category === "positive" ? tr(locale, "Positive", "إيجابي") : tr(locale, "Negative", "سلبي")}
                    </Badge>
                    <span className="mt-2 block font-normal text-slate-700 dark:text-navy-100">{b.text[locale]}</span>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-parent-leave" title={tr(locale, "Leave Requests", "طلبات الإجازة")}>
        <p className="text-sm text-slate-500 dark:text-navy-400">
          {tr(
            locale,
            `This sends a request for ${childName}. An admin decides, and you are told the result. Nothing is sent when you submit.`,
            `يرسل هذا طلبًا باسم ${childName}. تقرر الإدارة ويصلك الجواب. ولا يُرسَل شيء عند الإرسال.`,
          )}
        </p>
        <div className="space-y-4">
          <Card className="p-5">
            <LeaveForm
              key={activeId}
              locale={locale}
              idPrefix="practice-parent-leave"
              onResult={(error, v) => {
                if (error === null) {
                  setLeave((m) => ({
                    ...m,
                    [activeId]: [{ id: (m[activeId]?.length ?? 0) + 1, start: v.start, end: v.end, reason: v.reason.trim() }, ...(m[activeId] ?? [])],
                  }));
                }
              }}
            />
          </Card>
          <LeaveList locale={locale} rows={rowsOf} />
        </div>
      </Section>
    </PracticeFrame>
  );
}
