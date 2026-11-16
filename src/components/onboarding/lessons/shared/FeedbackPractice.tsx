"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";

const UI = {
  en: {
    title: "Feedback",
    subtitle: "Have an issue or a suggestion? Let us know.",
    category: "Category",
    technical: "Technical Issue",
    academic: "Academic Issue",
    suggestion: "Suggestion",
    general: "General Feedback",
    subject: "Subject",
    message: "Message",
    submit: "Submit",
    submitted: "Thanks — your feedback has been submitted.",
    reader: "Practice note: in the real app only you and the school's admins can read what you send.",
  },
  ar: {
    title: "الملاحظات",
    subtitle: "لديك مشكلة أو اقتراح؟ أخبرنا.",
    category: "الفئة",
    technical: "مشكلة تقنية",
    academic: "مشكلة أكاديمية",
    suggestion: "اقتراح",
    general: "ملاحظات عامة",
    subject: "الموضوع",
    message: "الرسالة",
    submit: "إرسال",
    submitted: "شكرًا — تم إرسال ملاحظاتك.",
    reader: "ملاحظة تدريبية: في التطبيق الحقيقي لا يقرأ ما ترسله إلا أنت ومدراء المدرسة.",
  },
} as const;

export default function FeedbackPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const [category, setCategory] = useState("general");
  const [done, setDone] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setDone(true);
    completeTask("submit");
    form.reset();
    setCategory("general");
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.title} description={ui.subtitle}>
      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div role="status" aria-live="polite">
            {done && (
              <Alert tone="success">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {ui.submitted}
                </span>
              </Alert>
            )}
          </div>
          <div>
            <label htmlFor="practice-feedback-category" className="label">
              {ui.category}
            </label>
            <select
              id="practice-feedback-category"
              name="practice-feedback-category"
              className="input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (e.target.value === "suggestion") completeTask("category");
              }}
            >
              <option value="technical">{ui.technical}</option>
              <option value="academic">{ui.academic}</option>
              <option value="suggestion">{ui.suggestion}</option>
              <option value="general">{ui.general}</option>
            </select>
          </div>
          <div>
            <label htmlFor="practice-feedback-subject" className="label">
              {ui.subject}
            </label>
            <input id="practice-feedback-subject" name="practice-feedback-subject" className="input" required />
          </div>
          <div>
            <label htmlFor="practice-feedback-message" className="label">
              {ui.message}
            </label>
            <textarea id="practice-feedback-message" name="practice-feedback-message" rows={5} className="input resize-y" required maxLength={4000} />
          </div>
          <Button type="submit">{ui.submit}</Button>
        </form>
      </Card>
      {level === "new" && <p className="text-sm text-slate-600 dark:text-navy-200">{ui.reader}</p>}
    </PracticeFrame>
  );
}
