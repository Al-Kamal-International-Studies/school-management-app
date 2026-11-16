"use client";

import { useState } from "react";
import { ArrowRight, GraduationCap, Percent, School, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, at } from "./common";

const T = {
  en: {
    title: "Overview",
    subtitle: "A snapshot of your school.",
    students: "Total students",
    teachers: "Total teachers",
    classes: "Classes",
    attendance: "Attendance rate",
    trend: "vs. last week",
    whereFrom: "Where does the attendance rate come from?",
    whereFromAnswer: "It is this week's attendance across the school, compared with last week. It comes from the attendance teachers mark.",
    quick: "Quick actions",
    actions: ["Add student or teacher", "New admission", "Create a class", "Manage subjects", "Build timetable"],
    actionLands: ["the Add user form", "the New admission form", "the Create class form", "the Subjects list", "the Timetable builder"],
    attention: "Needs attention",
    leave: "Pending leave requests",
    feedback: "Open feedback",
    resets: "Pending password resets",
    nothing: "Nothing pending",
    events: "Upcoming events",
    event: "Parents' evening",
    holiday: "Mid-term break",
    recent: "Recent activity",
    activity: ["Ms. Teacher One marked attendance", "Ms. Admin Sample approved a leave request", "Ms. Admin Sample created a student account"],
    viewAll: "View all",
    opens: "On the real page this takes you to",
    back: "Close",
    leaveLands: "the Leave requests list",
    feedbackLands: "the Feedback inbox",
    resetsLands: "the Password reset requests list",
    guide: "Each row under Needs attention is a button. Press one to jump straight to the page where you can deal with it.",
    guide2: "Quick actions are shortcuts to the jobs you do most. Press any of them.",
  },
  ar: {
    title: "نظرة عامة",
    subtitle: "لمحة عامة عن مدرستك.",
    students: "إجمالي الطلاب",
    teachers: "إجمالي المعلمين",
    classes: "الفصول",
    attendance: "نسبة الحضور",
    trend: "مقارنة بالأسبوع الماضي",
    whereFrom: "من أين تأتي نسبة الحضور؟",
    whereFromAnswer: "هي نسبة الحضور في المدرسة خلال هذا الأسبوع مقارنة بالأسبوع الماضي، وتُحسب من الحضور الذي يسجله المعلمون.",
    quick: "إجراءات سريعة",
    actions: ["إضافة طالب أو معلم", "قبول جديد", "إنشاء فصل", "إدارة المواد", "إنشاء الجدول الزمني"],
    actionLands: ["نموذج إضافة مستخدم", "نموذج القبول الجديد", "نموذج إنشاء فصل", "قائمة المواد", "منشئ الجدول الزمني"],
    attention: "يحتاج إلى انتباه",
    leave: "طلبات إجازة معلّقة",
    feedback: "ملاحظات مفتوحة",
    resets: "طلبات إعادة تعيين كلمة مرور معلّقة",
    nothing: "لا يوجد شيء معلّق",
    events: "الفعاليات القادمة",
    event: "اجتماع أولياء الأمور",
    holiday: "إجازة منتصف الفصل",
    recent: "النشاط الأخير",
    activity: ["الأستاذة معلمة أولى سجّلت الحضور", "الأستاذة مديرة نموذج وافقت على طلب إجازة", "الأستاذة مديرة نموذج أنشأت حساب طالب"],
    viewAll: "عرض الكل",
    opens: "في الصفحة الحقيقية ينقلك هذا إلى",
    back: "إغلاق",
    leaveLands: "قائمة طلبات الإجازة",
    feedbackLands: "صندوق الملاحظات",
    resetsLands: "قائمة طلبات إعادة تعيين كلمة المرور",
    guide: "كل صف تحت «يحتاج إلى انتباه» زر. اضغط على أحدها لتنتقل مباشرة إلى الصفحة التي تعالج الأمر.",
    guide2: "الإجراءات السريعة اختصارات لأكثر مهامك تكرارًا. اضغط على أيٍّ منها.",
  },
};

export default function OverviewPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [landed, setLanded] = useState<string | null>(null);
  const [showWhere, setShowWhere] = useState(false);

  const attention = [
    { label: t.leave, count: 3, lands: t.leaveLands },
    { label: t.feedback, count: 2, lands: t.feedbackLands },
    { label: t.resets, count: 0, lands: t.resetsLands },
  ];

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.students} value={6} icon={GraduationCap} />
        <StatCard label={t.teachers} value={3} icon={Users} />
        <StatCard label={t.classes} value={2} icon={School} />
        <StatCard label={t.attendance} value="94%" icon={Percent} delta={{ value: 2 }} hint={t.trend} />
      </div>
      <div>
        <LinkButton
          onClick={() => {
            setShowWhere(true);
            completeTask("read-attendance");
          }}
        >
          {t.whereFrom}
        </LinkButton>
        {showWhere && <p className="mt-1 text-sm text-slate-600 dark:text-navy-200">{t.whereFromAnswer}</p>}
      </div>

      <section className="space-y-3" aria-labelledby="practice-ov-attention">
        <h4 id="practice-ov-attention" className="section-title">
          {t.attention}
        </h4>
        <Guidance level={level}>{t.guide}</Guidance>
        <ul className="card divide-y divide-slate-100 dark:divide-navy-800">
          {attention.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  setLanded(a.lands);
                  completeTask("open-attention");
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <span className="font-medium text-slate-900 dark:text-white">{a.label}</span>
                <span className="flex items-center gap-2">
                  {a.count > 0 ? <Badge tone="amber">{a.count}</Badge> : <span className="text-xs text-slate-500 dark:text-navy-400">{t.nothing}</span>}
                  <ArrowRight className="h-4 w-4 text-slate-400 rtl:rotate-180" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="practice-ov-quick">
        <h4 id="practice-ov-quick" className="section-title">
          {t.quick}
        </h4>
        <Guidance level={level}>{t.guide2}</Guidance>
        <div className="flex flex-wrap gap-2">
          {t.actions.map((label, i) => (
            <Button
              key={label}
              type="button"
              variant={i === 0 ? "primary" : "secondary"}
              onClick={() => {
                setLanded(at(t.actionLands, i));
                completeTask("use-quick-action");
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      {landed && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100"
        >
          <span>
            {t.opens} <strong>{landed}</strong>.
          </span>
          <LinkButton onClick={() => setLanded(null)}>{t.back}</LinkButton>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h4 className="section-title">{t.events}</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-navy-100">
            <li className="flex items-center justify-between gap-2">
              <span>{t.event}</span>
              <Badge tone="navy">event</Badge>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>{t.holiday}</span>
              <Badge tone="slate">holiday</Badge>
            </li>
          </ul>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="section-title">{t.recent}</h4>
            <span className="text-xs text-slate-500 dark:text-navy-400">{t.viewAll}</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-navy-100">
            {t.activity.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Card>
      </div>
    </PracticeFrame>
  );
}
