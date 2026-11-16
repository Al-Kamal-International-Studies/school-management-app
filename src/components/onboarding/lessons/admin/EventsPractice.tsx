"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect } from "./common";

type Audience = "all" | "teacher" | "student" | "parent";

const T = {
  en: {
    title: "Calendar",
    newEvent: "New Event",
    heading: "Title",
    body: "Message",
    date: "Date",
    type: "Type",
    types: { event: "Event", holiday: "Holiday", deadline: "Deadline" },
    audience: "Audience",
    audiences: { all: "Everyone", teacher: "Teachers", student: "Students", parent: "Parents" },
    submit: "Submit",
    upcoming: "Upcoming",
    none: "No upcoming events.",
    delete: "Delete",
    confirmDelete: "Delete this event?",
    yes: "Yes",
    cancel: "Cancel",
    whoSees: "Who will see this event",
    sees: "Sees it",
    doesNot: "Does not see it",
    roles: { teacher: "Teachers", student: "Students", parent: "Parents" },
    parentsNote: "Parents can read events meant for students, so they see this one too.",
    admins: "Admins always see every event.",
    noNotice: "No notification is sent when you add an event. People find it in their Calendar.",
    guide: "Fill in a title and a date, choose a type and an audience, then press Submit. Try Students as the audience.",
    sample: { title: "Sports day", holiday: "National holiday" },
  },
  ar: {
    title: "التقويم",
    newEvent: "حدث جديد",
    heading: "العنوان",
    body: "الرسالة",
    date: "التاريخ",
    type: "النوع",
    types: { event: "حدث", holiday: "عطلة", deadline: "موعد نهائي" },
    audience: "الفئة المستهدفة",
    audiences: { all: "الجميع", teacher: "المعلمون", student: "الطلاب", parent: "أولياء الأمور" },
    submit: "إرسال",
    upcoming: "القادمة",
    none: "لا توجد أحداث قادمة.",
    delete: "حذف",
    confirmDelete: "هل تريد حذف هذا الحدث؟",
    yes: "نعم",
    cancel: "إلغاء",
    whoSees: "من سيرى هذا الحدث",
    sees: "يراه",
    doesNot: "لا يراه",
    roles: { teacher: "المعلمون", student: "الطلاب", parent: "أولياء الأمور" },
    parentsNote: "يستطيع أولياء الأمور قراءة الأحداث الموجّهة للطلاب، لذلك يرونه أيضًا.",
    admins: "يرى المسؤولون كل الأحداث دائمًا.",
    noNotice: "لا يُرسل أي إشعار عند إضافة حدث. يجده الناس في تقويمهم.",
    guide: "اكتب عنوانًا وتاريخًا، واختر النوع والفئة، ثم اضغط «إرسال». جرّب «الطلاب» كفئة مستهدفة.",
    sample: { title: "اليوم الرياضي", holiday: "عطلة رسمية" },
  },
};

interface Ev {
  id: string;
  title: string;
  date: string;
  type: "event" | "holiday" | "deadline";
  audience: Audience;
}

export default function EventsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [events, setEvents] = useState<Ev[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Ev["type"]>("event");
  const [audience, setAudience] = useState<Audience>("all");
  const [last, setLast] = useState<Ev | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const ev: Ev = { id: `e${events.length}-${title}`, title: title.trim(), date, type, audience };
    setEvents((prev) => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)));
    setLast(ev);
    setTitle("");
    setBody("");
    completeTask("add-event");
    if (audience === "student") completeTask("student-audience");
  }

  const sees = (role: "teacher" | "student" | "parent", a: Audience) => a === "all" || a === role || (role === "parent" && a === "student");

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title}>
      <Guidance level={level}>{t.guide}</Guidance>
      <Card className="space-y-4 p-5">
        <h4 className="section-title">{t.newEvent}</h4>
        <form onSubmit={submit} className="space-y-4">
          <Input label={t.heading} name="practice-ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label={t.body} name="practice-ev-body" rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={t.date} name="practice-ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <NativeSelect
              label={t.type}
              name="practice-ev-type"
              value={type}
              onChange={(e) => setType(e.target.value as Ev["type"])}
              options={Object.entries(t.types).map(([v, l]) => ({ value: v, label: l }))}
            />
            <NativeSelect
              label={t.audience}
              name="practice-ev-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              options={Object.entries(t.audiences).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
          <Button type="submit">{t.submit}</Button>
        </form>
      </Card>

      {last && (
        <Alert tone="info">
          <p className="font-medium">
            {t.whoSees}: {last.title}
          </p>
          <ul className="mt-2 space-y-1">
            {(["teacher", "student", "parent"] as const).map((role) => (
              <li key={role}>
                {t.roles[role]}: <strong>{sees(role, last.audience) ? t.sees : t.doesNot}</strong>
              </li>
            ))}
          </ul>
          {last.audience === "student" && <p className="mt-2">{t.parentsNote}</p>}
          <p className="mt-2">{t.admins}</p>
          <p className="mt-1">{t.noNotice}</p>
        </Alert>
      )}

      <section aria-labelledby="practice-ev-list" className="space-y-2">
        <h4 id="practice-ev-list" className="section-title">
          {t.upcoming}
        </h4>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
        ) : (
          <ul className="card divide-y divide-slate-100 dark:divide-navy-800">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{ev.title}</p>
                  <p className="text-xs text-slate-500 dark:text-navy-400">
                    <bdi dir="ltr">{ev.date}</bdi> · {t.audiences[ev.audience]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={ev.type === "holiday" ? "slate" : ev.type === "deadline" ? "red" : "navy"}>{ev.type}</Badge>
                  {asking === ev.id ? (
                    <span className="flex items-center gap-2">
                      <span>{t.confirmDelete}</span>
                      <LinkButton
                        danger
                        onClick={() => {
                          setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                          setAsking(null);
                        }}
                      >
                        {t.yes}
                      </LinkButton>
                      <LinkButton onClick={() => setAsking(null)}>{t.cancel}</LinkButton>
                    </span>
                  ) : (
                    <LinkButton danger onClick={() => setAsking(ev.id)}>
                      {t.delete}
                      <span className="sr-only"> {ev.title}</span>
                    </LinkButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PracticeFrame>
  );
}
