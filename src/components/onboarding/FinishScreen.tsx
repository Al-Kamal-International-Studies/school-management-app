"use client";

import { BellRing, Check, Fingerprint, ShieldCheck, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListCard, ListRows } from "@/components/ui/List";
import { PushNotificationToggle } from "@/components/settings/PushNotificationToggle";
import { fill, type FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import { lessonTexts } from "@/lib/onboarding/registry";
import type { Device, LessonDef, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { ScreenTitle } from "./parts";

function SetupCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="flex items-start gap-3 p-5">
      <span className="mt-0.5 shrink-0 text-slate-500 dark:text-navy-300" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="card-title">{title}</h3>
        {children}
      </div>
    </Card>
  );
}

/** Chapter 5: recap, optional setup suited to the role, and Finish. */
export function FinishScreen({
  role,
  device,
  lessons,
  completed,
  locale,
  preview,
  previewDone,
  finishing,
  failed,
  remaining,
  t,
  onFinish,
  onJumpToRemaining,
}: {
  role: UserRole;
  device: Device | undefined;
  lessons: LessonDef[];
  completed: ReadonlySet<string>;
  locale: OnboardingLocale;
  preview: boolean;
  previewDone: boolean;
  finishing: boolean;
  failed: boolean;
  /** Lessons in the current list that are not completed yet. */
  remaining: number;
  t: FrameworkStrings;
  onFinish: () => void;
  onJumpToRemaining: () => void;
}) {
  const f = t.finish;
  const doneCount = lessons.filter((l) => completed.has(l.id)).length;
  const showPhone = device === "phone" || device === "both";

  return (
    <div className="space-y-7">
      <ScreenTitle title={remaining > 0 ? f.titleAlmost : f.title} description={f.intro} />

      {lessons.length > 0 && (
        <section aria-labelledby="onb-recap" className="max-w-3xl space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="onb-recap" className="section-title">
              {f.recap}
            </h2>
            <p className="text-sm text-slate-500 dark:text-navy-300">{fill(f.recapDone, { done: doneCount, total: lessons.length })}</p>
          </div>
          <ListCard>
            <ListRows>
              {lessons.map((l) => {
                const done = completed.has(l.id);
                return (
                  <li key={l.id} className="flex min-h-12 items-center gap-3 px-5 py-2.5">
                    <span
                      aria-hidden="true"
                      className={
                        done
                          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500"
                          : "h-5 w-5 shrink-0 rounded-full border border-slate-300 dark:border-navy-600"
                      }
                    >
                      {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-white">{lessonTexts(l, role)[locale].title}</span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-navy-300">{done ? t.lesson.done : f.notDone}</span>
                  </li>
                );
              })}
            </ListRows>
          </ListCard>
        </section>
      )}

      <section aria-labelledby="onb-setup" className="max-w-3xl space-y-3">
        <h2 id="onb-setup" className="section-title">
          {f.setupTitle}
        </h2>
        <div className="space-y-3">
          <SetupCard icon={<BellRing className="h-5 w-5" strokeWidth={1.75} />} title={f.push.title}>
            <p className="text-sm text-slate-600 dark:text-navy-200">{f.push.body}</p>
            {preview ? <p className="text-sm text-slate-500 dark:text-navy-300">{f.push.previewNote}</p> : <PushNotificationToggle />}
          </SetupCard>
          {showPhone && (
            <SetupCard icon={<Smartphone className="h-5 w-5" strokeWidth={1.75} />} title={f.phone.title}>
              <p className="text-sm text-slate-600 dark:text-navy-200">{f.phone.body}</p>
            </SetupCard>
          )}
          {role === "teacher" && (
            <SetupCard icon={<Fingerprint className="h-5 w-5" strokeWidth={1.75} />} title={f.passkey.title}>
              <p className="text-sm text-slate-600 dark:text-navy-200">{f.passkey.body}</p>
            </SetupCard>
          )}
          {role === "admin" && (
            <SetupCard icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />} title={f.totp.title}>
              <p className="text-sm text-slate-600 dark:text-navy-200">{f.totp.body}</p>
            </SetupCard>
          )}
        </div>
      </section>

      <div className="max-w-3xl space-y-3">
        {failed && <Alert tone="error">{f.error}</Alert>}
        {previewDone && <Alert tone="info">{f.previewDone}</Alert>}
        {remaining > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p id="onb-finish-hint" className="text-sm text-slate-600 dark:text-navy-200">
              {fill(f.remaining, { n: remaining })}
            </p>
            <Button type="button" variant="secondary" onClick={onJumpToRemaining}>
              {f.goToRemaining}
            </Button>
          </div>
        )}
        <Button
          type="button"
          onClick={onFinish}
          loading={finishing}
          disabled={remaining > 0}
          aria-describedby={remaining > 0 ? "onb-finish-hint" : undefined}
        >
          {finishing ? f.finishing : f.finishButton}
        </Button>
      </div>
    </div>
  );
}
