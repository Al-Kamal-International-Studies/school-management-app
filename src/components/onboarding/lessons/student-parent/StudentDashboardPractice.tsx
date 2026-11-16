"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ListCard, ListRows, Section } from "@/components/ui/List";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, PickRow, isoDate, tr } from "./shared";

const [maths, science, english] = [FakePeople.subjects[0]!, FakePeople.subjects[1]!, FakePeople.subjects[2]!];
const [t1, t2, t3] = [FakePeople.teachers[0]!, FakePeople.teachers[1]!, FakePeople.teachers[2]!];

const LESSONS = [
  { id: "l1", start: "08:00", end: "08:45", subject: maths, teacher: t1, room: "12" },
  { id: "l2", start: "09:00", end: "09:45", subject: english, teacher: t2, room: "5" },
  { id: "l3", start: "10:15", end: "11:00", subject: science, teacher: t3, room: "Lab 2" },
];

export default function StudentDashboardPractice({ locale, dir, level, completedTasks, completeTask }: PracticeProps) {
  const { toast, show } = useFakeToast(6000);
  const name = (e: (typeof FakePeople.subjects)[number]) => FakePeople.name(e, locale);

  const upcoming = [
    { id: "u1", kind: "assignment" as const, title: tr(locale, "Fractions worksheet", "ورقة عمل الكسور"), subject: maths, date: isoDate(1) },
    { id: "u2", kind: "quiz" as const, title: tr(locale, "Science quiz", "مذاكرة العلوم"), subject: science, date: isoDate(4) },
    { id: "u3", kind: "exam" as const, title: tr(locale, "Mathematics exam", "اختبار الرياضيات"), subject: maths, date: isoDate(10) },
  ];
  const kindLabel = { assignment: tr(locale, "Assignment", "واجب"), quiz: tr(locale, "Quiz", "مذاكرة"), exam: tr(locale, "Exam", "اختبار") };
  const kindPage = {
    assignment: tr(locale, "Assignments", "الواجبات"),
    quiz: tr(locale, "Exams", "الاختبارات"),
    exam: tr(locale, "Exams", "الاختبارات"),
  };
  const grades = [
    { id: "g1", subject: maths, assessment: tr(locale, "Midterm", "اختبار منتصف الفصل"), got: 18, total: 20 },
    { id: "g2", subject: science, assessment: tr(locale, "Lab report", "تقرير المختبر"), got: 15, total: 20 },
    { id: "g3", subject: english, assessment: tr(locale, "Essay", "مقال"), got: 12, total: 20 },
  ];

  const real = (page: string) => tr(locale, `On the real page this opens ${page}.`, `في الصفحة الحقيقية يفتح هذا صفحة «${page}».`);

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={`${tr(locale, "Welcome", "مرحبًا")}, ${FakePeople.name(FakePeople.students[0]!, locale)}`}
      description={`${FakePeople.name(FakePeople.classes[0]!, locale)} · ${tr(locale, "Enrollment #", "رقم القيد #")}2101`}
    >
      {toast}
      <Guide
        level={level}
        locale={locale}
        completed={completedTasks}
        steps={[
          { id: "lesson", text: tr(locale, "Press the first lesson in Today's schedule.", "اضغط على أول حصة في «جدول اليوم».") },
          { id: "due", text: tr(locale, "In Upcoming tasks & exams, press the item with the earliest date.", "في «المهام والاختبارات القادمة»، اضغط على العنصر ذي أبكر تاريخ.") },
          { id: "grade", text: tr(locale, "In Recent grades, press the Mathematics row.", "في «أحدث الدرجات»، اضغط على صف الرياضيات.") },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h4 className="card-title">{tr(locale, "Academic Progress", "التقدم الأكاديمي")}</h4>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing value={82.5} size={96} label={tr(locale, "Overall Score", "الدرجة الإجمالية")} />
            <p className="text-xs text-slate-500 dark:text-navy-400">{tr(locale, "vs. last month: up 2.0", "مقارنة بالشهر الماضي: ارتفاع 2.0")}</p>
          </div>
        </Card>
        <Card className="p-5">
          <h4 className="card-title">{tr(locale, "Attendance Summary", "ملخص الحضور")}</h4>
          <p className="tabular mt-4 font-display text-[2rem] font-semibold leading-none text-navy-950 dark:text-white">94.0%</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-navy-400">{tr(locale, "This month", "هذا الشهر")}</p>
        </Card>
      </div>

      <Section id="practice-student-today" title={tr(locale, "Today's schedule", "جدول اليوم")}>
        <ListCard>
          <ListRows>
            {LESSONS.map((l) => (
              <PickRow
                key={l.id}
                onPick={() => {
                  if (l.id === "l1") {
                    completeTask("lesson");
                    show(`${tr(locale, "Yes, your first lesson is", "صحيح، أول حصة لك هي")} ${name(l.subject)} (${l.start}). ${real(tr(locale, "My timetable", "جدولي الزمني"))}`);
                  } else {
                    show(
                      tr(
                        locale,
                        `${name(l.subject)} starts at ${l.start}. Your first lesson is the one with the earliest time.`,
                        `حصة ${name(l.subject)} تبدأ الساعة ${l.start}. أول حصة لك هي الحصة ذات أبكر وقت.`,
                      ),
                      "error",
                    );
                  }
                }}
                leading={
                  <span className="tabular w-[8.75rem] shrink-0 whitespace-nowrap text-sm text-slate-500 dark:text-navy-400">
                    <bdi dir="ltr">
                      {l.start} – {l.end}
                    </bdi>
                  </span>
                }
                title={name(l.subject)}
                subtitle={FakePeople.name(l.teacher, locale)}
                trailing={
                  <span className="shrink-0 text-xs text-slate-500 dark:text-navy-400">
                    {tr(locale, "Room", "القاعة")} <bdi>{l.room}</bdi>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-student-upcoming" title={tr(locale, "Upcoming Tasks & Exams", "المهام والاختبارات القادمة")}>
        <ListCard>
          <ListRows>
            {upcoming.map((u) => (
              <PickRow
                key={u.id}
                onPick={() => {
                  if (u.id === "u1") {
                    completeTask("due");
                    show(`${tr(locale, "Yes, this is due first", "صحيح، هذا هو الأقرب موعدًا")} (${u.date}). ${real(kindPage[u.kind])}`);
                  } else {
                    show(
                      tr(
                        locale,
                        `This one is due on ${u.date}. Look for the earliest date in the list.`,
                        `موعد هذا العنصر ${u.date}. ابحث عن أبكر تاريخ في القائمة.`,
                      ),
                      "error",
                    );
                  }
                }}
                title={u.title}
                subtitle={name(u.subject)}
                trailing={
                  <span className="flex shrink-0 items-center gap-3">
                    <Badge tone="navy">{kindLabel[u.kind]}</Badge>
                    <span className="tabular text-xs text-slate-500 dark:text-navy-400">
                      <bdi dir="ltr">{u.date}</bdi>
                    </span>
                  </span>
                }
              />
            ))}
          </ListRows>
        </ListCard>
      </Section>

      <Section id="practice-student-grades" title={tr(locale, "Recent Grades", "أحدث الدرجات")}>
        <ListCard>
          <ListRows>
            {grades.map((g) => (
              <PickRow
                key={g.id}
                onPick={() => {
                  if (g.id === "g1") {
                    completeTask("grade");
                    show(`${name(g.subject)}: ${g.got}/${g.total}. ${real(tr(locale, "Grades", "الدرجات"))}`);
                  } else {
                    show(
                      tr(locale, `That is your ${name(g.subject)} mark. Press the Mathematics row.`, `هذه درجتك في ${name(g.subject)}. اضغط على صف الرياضيات.`),
                      "error",
                    );
                  }
                }}
                title={g.assessment}
                subtitle={name(g.subject)}
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
    </PracticeFrame>
  );
}
