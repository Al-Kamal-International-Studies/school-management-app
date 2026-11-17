"use client";

import { ExternalLink, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { CAMBRILEARN_DISPLAY_ADDRESS as ADDRESS } from "@/lib/cambrilearn";

const UI = {
  en: {
    tab: "CambriLearn",
    addressLabel: "Web address",
    addressShown: "This is the page the button opens:",
    open: "Open CambriLearn",
    tip1: "Sign in with your CambriLearn username and password, not your Al Kamal one.",
    tip2: "CambriLearn opens in a new tab. Switch back to the Al Kamal tab to return.",
    fake: "Practice only: nothing opened. In the real app, CambriLearn opens in a new tab.",
    newHint: "Press the address bar, then press Open CambriLearn.",
  },
  ar: {
    tab: "CambriLearn",
    addressLabel: "عنوان الموقع",
    addressShown: "هذه هي الصفحة التي يفتحها الزر:",
    open: "فتح CambriLearn",
    tip1: "سجّل الدخول باسم المستخدم وكلمة المرور الخاصين بـ CambriLearn، وليس بيانات الكمال.",
    tip2: "يفتح CambriLearn في تبويبة جديدة. عد إلى تبويبة الكمال للرجوع.",
    fake: "للتدريب فقط: لم يُفتح شيء. في التطبيق الحقيقي يفتح CambriLearn في تبويبة جديدة.",
    newHint: "اضغط على شريط العنوان ثم اضغط «فتح CambriLearn».",
  },
} as const;

/** Pretend browser window. It never opens a link or makes a network request. */
export default function CambriLearnPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const { toast, show } = useFakeToast(8000);
  const [addressSeen, setAddressSeen] = useState(false);

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.tab}>
      {level === "new" && <p className="text-sm text-slate-600 dark:text-navy-200">{ui.newHint}</p>}
      {toast}
      <Card className="overflow-hidden p-0">
        <div className="flex items-end gap-2 border-b border-slate-200 bg-slate-100 px-3 pt-2 dark:border-navy-700 dark:bg-navy-900">
          <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white">
            <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{ui.tab}</span>
          </div>
        </div>
        <div className="border-b border-slate-200 bg-white p-2 dark:border-navy-700 dark:bg-navy-800">
          <button
            type="button"
            onClick={() => {
              setAddressSeen(true);
              completeTask("find-address");
            }}
            aria-label={`${ui.addressLabel}: ${ADDRESS}`}
            dir="ltr"
            className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-start text-sm text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:border-navy-600 dark:bg-navy-900 dark:text-navy-100"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="min-w-0 truncate">{ADDRESS}</span>
          </button>
          {addressSeen && (
            <p className="mt-2 px-1 text-xs text-slate-500 dark:text-navy-300">
              {ui.addressShown} <span dir="ltr" className="font-medium text-navy-900 dark:text-white">{ADDRESS}</span>
            </p>
          )}
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <button
            type="button"
            onClick={() => {
              completeTask("open-portal");
              show(ui.fake, "info");
            }}
            className="btn-primary"
          >
            {ui.open}
            <ExternalLink className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-slate-600 dark:text-navy-200">
            <li>{ui.tip1}</li>
            <li>{ui.tip2}</li>
          </ul>
        </div>
      </Card>
    </PracticeFrame>
  );
}
