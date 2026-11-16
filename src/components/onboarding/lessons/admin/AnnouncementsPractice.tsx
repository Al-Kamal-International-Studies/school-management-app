"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect, ResponsiveTable } from "./common";

type Audience = "all" | "teacher" | "student" | "parent";
type Role = "teacher" | "student" | "parent" | "admin";

const T = {
  en: {
    title: "Announcements",
    subtitle: "Posted announcements appear on the relevant dashboards immediately.",
    newOne: "New Announcement",
    heading: "Title",
    body: "Message",
    audience: "Audience",
    audiences: { all: "Everyone", teacher: "Teachers", student: "Students", parent: "Parents" },
    submit: "Submit",
    errTitle: "Title is required.",
    errBody: "Message is required.",
    list: "Posted",
    none: "No announcements right now.",
    delete: "Delete",
    confirmDelete: "Delete this announcement?",
    yes: "Yes",
    cancel: "Cancel",
    who: "Who gets a notification",
    head: ["Group", "Gets a bell and push notification", "Can read it"],
    roles: { teacher: "Teachers", student: "Students", parent: "Parents", admin: "Admins" },
    yesText: "Yes",
    noText: "No",
    everyoneNote: "Everyone means every account in the school, including inactive accounts and the admins themselves.",
    studentNote: "A Students announcement notifies students only. Parents can read it on their dashboard, but they are not told about it.",
    guide: "Write a title and a message, choose who it is for, then press Submit. Read who is notified. Post another one for Students, then delete one.",
  },
  ar: {
    title: "الإعلانات",
    subtitle: "تظهر الإعلانات المنشورة في لوحات التحكم المعنية فورًا.",
    newOne: "إعلان جديد",
    heading: "العنوان",
    body: "الرسالة",
    audience: "الفئة المستهدفة",
    audiences: { all: "الجميع", teacher: "المعلمون", student: "الطلاب", parent: "أولياء الأمور" },
    submit: "إرسال",
    errTitle: "العنوان مطلوب.",
    errBody: "الرسالة مطلوبة.",
    list: "تاريخ النشر",
    none: "لا توجد إعلانات حاليًا.",
    delete: "حذف",
    confirmDelete: "هل تريد حذف هذا الإعلان؟",
    yes: "نعم",
    cancel: "إلغاء",
    who: "من يصله إشعار",
    head: ["الفئة", "يصله إشعار في الجرس وتنبيه", "يستطيع قراءته"],
    roles: { teacher: "المعلمون", student: "الطلاب", parent: "أولياء الأمور", admin: "المسؤولون" },
    yesText: "نعم",
    noText: "لا",
    everyoneNote: "«الجميع» تعني كل حساب في المدرسة، بما فيها الحسابات غير النشطة والمسؤولون أنفسهم.",
    studentNote: "الإعلان الموجّه للطلاب ينبّه الطلاب فقط. يستطيع أولياء الأمور قراءته في لوحتهم، لكن لا يصلهم إشعار به.",
    guide: "اكتب عنوانًا ورسالة، واختر الفئة المستهدفة، ثم اضغط «إرسال». اقرأ من يصله الإشعار. انشر إعلانًا آخر للطلاب ثم احذف أحدها.",
  },
};

interface Post {
  id: string;
  title: string;
  audience: Audience;
}

const notified = (a: Audience, r: Role) => (a === "all" ? true : a === r);
const canRead = (a: Audience, r: Role) => r === "admin" || a === "all" || a === r || (r === "parent" && a === "student");

export default function AnnouncementsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [error, setError] = useState<{ field: "title" | "body"; text: string } | null>(null);
  const [last, setLast] = useState<Post | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError({ field: "title", text: t.errTitle });
    if (!body.trim()) return setError({ field: "body", text: t.errBody });
    setError(null);
    const p: Post = { id: `a${posts.length}-${title}`, title: title.trim(), audience };
    setPosts((prev) => [p, ...prev]);
    setLast(p);
    setTitle("");
    setBody("");
    completeTask("post-announcement");
    if (audience === "student") completeTask("student-audience");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <Card className="space-y-4 p-5">
        <h4 className="section-title">{t.newOne}</h4>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label={t.heading}
            name="practice-an-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={error?.field === "title" ? error.text : undefined}
          />
          <Textarea
            label={t.body}
            name="practice-an-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            error={error?.field === "body" ? error.text : undefined}
          />
          <NativeSelect
            label={t.audience}
            name="practice-an-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            options={Object.entries(t.audiences).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Button type="submit">{t.submit}</Button>
        </form>
      </Card>

      {last && (
        <div className="space-y-3" role="status">
          <h4 className="section-title">
            {t.who}: {last.title}
          </h4>
          <ResponsiveTable
            head={t.head}
            rows={(["teacher", "student", "parent", "admin"] as Role[]).map((r) => ({
              key: r,
              cells: [
                t.roles[r],
                <strong key="n">{notified(last.audience, r) ? t.yesText : t.noText}</strong>,
                <strong key="r">{canRead(last.audience, r) ? t.yesText : t.noText}</strong>,
              ],
            }))}
          />
          {last.audience === "all" && <Alert tone="info">{t.everyoneNote}</Alert>}
          {last.audience === "student" && <Alert tone="warning">{t.studentNote}</Alert>}
        </div>
      )}

      <section aria-labelledby="practice-an-list" className="space-y-2">
        <h4 id="practice-an-list" className="section-title">
          {t.list}
        </h4>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
        ) : (
          <ul className="card divide-y divide-slate-100 dark:divide-navy-800">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{p.title}</p>
                  <p className="text-xs text-slate-500 dark:text-navy-400">{t.audiences[p.audience]}</p>
                </div>
                {asking === p.id ? (
                  <span className="flex items-center gap-2">
                    <span>{t.confirmDelete}</span>
                    <LinkButton
                      danger
                      onClick={() => {
                        setPosts((prev) => prev.filter((x) => x.id !== p.id));
                        setAsking(null);
                        completeTask("delete-announcement");
                      }}
                    >
                      {t.yes}
                    </LinkButton>
                    <LinkButton onClick={() => setAsking(null)}>{t.cancel}</LinkButton>
                  </span>
                ) : (
                  <LinkButton danger onClick={() => setAsking(p.id)}>
                    {t.delete}
                    <span className="sr-only"> {p.title}</span>
                  </LinkButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PracticeFrame>
  );
}
