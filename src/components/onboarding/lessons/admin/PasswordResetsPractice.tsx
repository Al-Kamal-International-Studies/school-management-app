"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, ResponsiveTable } from "./common";

const T = {
  en: {
    title: "Password Reset Requests",
    subtitle: 'Requests submitted from the "Forgot password?" link on the sign-in page.',
    empty: "No pending password reset requests.",
    head: ["Email", "Requested", ""],
    viewAccount: "View account",
    dismiss: "Dismiss",
    when: ["Today, 08:12", "Today, 09:40", "Yesterday, 17:05"],
    noAccountNote: "The last request has no account behind it, so it only offers Dismiss.",
    guide: "Press View account on the first request. That opens the person's user page, where the real fix lives.",
    userTitle: "User",
    email: "Email",
    role: "Role",
    teacher: "Teacher",
    parent: "Parent",
    back: "Back to requests",
    setPassword: "Set a new password",
    setPasswordDescription: "Sets their password directly — no email involved. They'll be asked to change it the next time they sign in.",
    newPassword: "New password",
    generate: "Generate",
    save: "Set password",
    tooShort: "Password must be at least 12 characters.",
    done: "Password set. Share it with them securely.",
    completed: "The matching reset request was marked completed and has left the list.",
    guideSet: "Type a password of 12 or more characters (or press Generate), then press Set password.",
  },
  ar: {
    title: "طلبات إعادة تعيين كلمة المرور",
    subtitle: 'طلبات مُرسلة من رابط "هل نسيت كلمة المرور؟" في صفحة تسجيل الدخول.',
    empty: "لا توجد طلبات إعادة تعيين كلمة مرور معلّقة.",
    head: ["البريد الإلكتروني", "تاريخ الطلب", ""],
    viewAccount: "عرض الحساب",
    dismiss: "تجاهل",
    when: ["اليوم، 08:12", "اليوم، 09:40", "أمس، 17:05"],
    noAccountNote: "الطلب الأخير لا يوجد حساب خلفه، لذلك يعرض خيار «تجاهل» فقط.",
    guide: "اضغط «عرض الحساب» عند الطلب الأول. يفتح هذا صفحة المستخدم، وفيها الحل الحقيقي.",
    userTitle: "المستخدم",
    email: "البريد الإلكتروني",
    role: "الدور",
    teacher: "معلم",
    parent: "ولي أمر",
    back: "العودة إلى الطلبات",
    setPassword: "تعيين كلمة مرور جديدة",
    setPasswordDescription: "يُعيّن كلمة المرور مباشرة — دون أي بريد إلكتروني. سيُطلب منهم تغييرها في المرة القادمة التي يسجلون فيها الدخول.",
    newPassword: "كلمة المرور الجديدة",
    generate: "توليد",
    save: "تعيين كلمة المرور",
    tooShort: "يجب ألا تقل كلمة المرور عن 12 حرفًا.",
    done: "تم تعيين كلمة المرور. شاركها معهم بشكل آمن.",
    completed: "اعتُبر طلب إعادة التعيين المطابق مكتملًا وخرج من القائمة.",
    guideSet: "اكتب كلمة مرور من 12 حرفًا أو أكثر (أو اضغط «توليد»)، ثم اضغط «تعيين كلمة المرور».",
  },
};

interface Req {
  id: string;
  email: string;
  person?: { en: string; ar: string };
  role?: "teacher" | "parent";
}

const INITIAL: Req[] = [
  { id: "r1", email: "teacher.one@practice.example", person: FakePeople.teachers[0], role: "teacher" },
  { id: "r2", email: "mrs.sample@practice.example", person: FakePeople.parents[1], role: "parent" },
  { id: "r3", email: "nobody@practice.example" },
];

export default function PasswordResetsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [reqs, setReqs] = useState<Req[]>(INITIAL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const open = reqs.find((r) => r.id === openId) ?? null;

  function save(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) return setError(t.tooShort);
    setError(null);
    setSaved(true);
    setReqs((prev) => prev.filter((r) => r.id !== openId));
    completeTask("set-password");
  }

  function leaveUser() {
    setOpenId(null);
    setPassword("");
    setError(null);
    setSaved(false);
  }

  if (openId && (open || saved)) {
    const who = (open ?? INITIAL.find((r) => r.id === openId))!;
    return (
      <PracticeFrame locale={locale} dir={dir} title={who.person?.[locale] ?? t.userTitle}>
        <LinkButton onClick={leaveUser}>{t.back}</LinkButton>
        <dl className="grid gap-1 text-sm text-slate-700 dark:text-navy-100">
          <div>
            <dt className="inline font-medium">{t.email}: </dt>
            <dd className="inline">
              <bdi dir="ltr">{who.email}</bdi>
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">{t.role}: </dt>
            <dd className="inline">{who.role === "parent" ? t.parent : t.teacher}</dd>
          </div>
        </dl>
        <Card className="space-y-4 p-5">
          <div>
            <h4 className="section-title">{t.setPassword}</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{t.setPasswordDescription}</p>
          </div>
          <Guidance level={level}>{t.guideSet}</Guidance>
          <form onSubmit={save} className="space-y-4">
            <Input
              label={t.newPassword}
              name="practice-pr-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setPassword("Maple-River-Stone-4821")}>
                {t.generate}
              </Button>
              <Button type="submit">{t.save}</Button>
            </div>
          </form>
          {saved && (
            <div className="space-y-2">
              <Alert tone="success">{t.done}</Alert>
              <p className="text-sm text-slate-600 dark:text-navy-200">{t.completed}</p>
            </div>
          )}
        </Card>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      {reqs.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{t.empty}</p>
      ) : (
        <ResponsiveTable
          head={t.head}
          rows={reqs.map((r, i) => ({
            key: r.id,
            cells: [
              <bdi key="e" dir="ltr" className="font-medium text-slate-900 dark:text-white">
                {r.email}
              </bdi>,
              t.when[INITIAL.findIndex((x) => x.id === r.id)] ?? t.when[i],
              <span key="a" className="flex flex-wrap items-center gap-3">
                {r.person && (
                  <LinkButton
                    onClick={() => {
                      setOpenId(r.id);
                      setPassword("");
                      setSaved(false);
                      completeTask("view-account");
                    }}
                  >
                    {t.viewAccount}
                    <span className="sr-only"> {r.email}</span>
                  </LinkButton>
                )}
                <LinkButton
                  onClick={() => {
                    setReqs((prev) => prev.filter((x) => x.id !== r.id));
                    completeTask("dismiss");
                  }}
                >
                  {t.dismiss}
                  <span className="sr-only"> {r.email}</span>
                </LinkButton>
              </span>,
            ],
          }))}
        />
      )}
      {reqs.some((r) => !r.person) && <p className="text-sm text-slate-500 dark:text-navy-400">{t.noAccountNote}</p>}
    </PracticeFrame>
  );
}
