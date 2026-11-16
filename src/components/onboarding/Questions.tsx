"use client";

import { DEVICES, FOCUS_OPTIONS, LEVELS, MAX_FOCUS, type QuestionId } from "@/lib/onboarding/config";
import { fill, type FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import type { Answers } from "@/lib/onboarding/storage";
import type { Device, FocusTag, Level, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { Card } from "@/components/ui/Card";
import { OptionCard, ScreenTitle } from "./parts";

/** Language and look always have a selection (the current value); device and level must be chosen. */
export function isQuestionAnswered(id: QuestionId, answers: Answers): boolean {
  if (id === "device") return !!answers.device;
  if (id === "level") return !!answers.level;
  return true;
}

export function QuestionScreen({
  id,
  index,
  total,
  role,
  answers,
  locale,
  theme,
  t,
  onLanguage,
  onLook,
  onDevice,
  onLevel,
  onFocus,
}: {
  id: QuestionId;
  index: number;
  total: number;
  role: UserRole;
  answers: Answers;
  locale: OnboardingLocale;
  theme: "light" | "dark";
  t: FrameworkStrings;
  onLanguage: (l: OnboardingLocale) => void;
  onLook: (v: "light" | "dark") => void;
  onDevice: (v: Device) => void;
  onLevel: (v: Level) => void;
  onFocus: (tags: FocusTag[]) => void;
}) {
  const q = t.questions;
  const progress = fill(q.progress, { n: index + 1, total });
  const titleId = `onb-q-${id}`;
  const intro =
    index === 0 ? (
      <Card className="max-w-2xl space-y-1.5 p-5">
        <h2 className="card-title">{t.welcome.title}</h2>
        <p className="text-sm text-slate-600 dark:text-navy-200">{t.welcome.intro}</p>
        <p className="text-sm text-slate-500 dark:text-navy-300">{t.welcome.roleLine[role]}</p>
      </Card>
    ) : null;

  let heading: string;
  let hint: string;
  let body: React.ReactNode;

  if (id === "language") {
    heading = q.language.title;
    hint = q.language.hint;
    const selected = answers.language ?? locale;
    body = (
      <div role="radiogroup" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-2">
        {(["en", "ar"] as const).map((code) => (
          <OptionCard
            key={code}
            type="radio"
            name="onb-language"
            value={code}
            checked={selected === code}
            onChange={() => onLanguage(code)}
            label={q.language[code]}
            lang={code}
          />
        ))}
      </div>
    );
  } else if (id === "look") {
    heading = q.look.title;
    hint = q.look.hint;
    const selected = answers.look ?? theme;
    body = (
      <div role="radiogroup" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-2">
        {(["light", "dark"] as const).map((v) => (
          <OptionCard key={v} type="radio" name="onb-look" value={v} checked={selected === v} onChange={() => onLook(v)} label={q.look[v]} />
        ))}
      </div>
    );
  } else if (id === "device") {
    heading = q.device.title;
    hint = q.device.hint;
    body = (
      <div role="radiogroup" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-3">
        {DEVICES.map((v) => (
          <OptionCard key={v} type="radio" name="onb-device" value={v} checked={answers.device === v} onChange={() => onDevice(v)} label={q.device[v]} />
        ))}
      </div>
    );
  } else if (id === "level") {
    heading = q.level.title;
    hint = q.level.hint;
    body = (
      <div role="radiogroup" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-3">
        {LEVELS.map((v) => (
          <OptionCard
            key={v}
            type="radio"
            name="onb-level"
            value={v}
            checked={answers.level === v}
            onChange={() => onLevel(v)}
            label={q.level[v].label}
            description={q.level[v].desc}
          />
        ))}
      </div>
    );
  } else {
    heading = q.focus.title[role];
    hint = fill(q.focus.hint, { max: MAX_FOCUS });
    const chosen = answers.focus;
    const atLimit = chosen.length >= MAX_FOCUS;
    body = (
      <div className="space-y-3">
        <div role="group" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-2">
          {FOCUS_OPTIONS[role].map((tag) => {
            const checked = chosen.includes(tag);
            return (
              <OptionCard
                key={tag}
                type="checkbox"
                name="onb-focus"
                value={tag}
                checked={checked}
                disabled={!checked && atLimit}
                onChange={() => onFocus(checked ? chosen.filter((c) => c !== tag) : [...chosen, tag])}
                label={q.focus.options[tag].label}
                description={q.focus.options[tag].desc}
              />
            );
          })}
        </div>
        <p className="text-sm text-slate-500 dark:text-navy-300" aria-live="polite">
          {atLimit ? fill(q.focus.limit, { max: MAX_FOCUS }) : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {intro}
      <ScreenTitle id={titleId} eyebrow={progress} title={heading} description={hint} />
      {body}
    </div>
  );
}
