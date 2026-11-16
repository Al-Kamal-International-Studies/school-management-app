"use client";

import Link from "next/link";
import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { CheckCircle2, Circle, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fill, type FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import { lessonTexts } from "@/lib/onboarding/registry";
import type { Device, LessonDef, Level, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";
import { Chip, ScreenTitle } from "./parts";

/** How long a "new" user can sit on a task before its hint appears by itself. */
const AUTO_HINT_MS = 20_000;

/** Keeps a broken practice screen from taking the whole flow down. */
class PracticeBoundary extends Component<
  { fallback: (reset: () => void) => ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Onboarding practice screen failed:", error, info.componentStack);
  }
  render() {
    if (this.state.failed) return this.props.fallback(() => this.setState({ failed: false }));
    return this.props.children;
  }
}

export function LessonScreen({
  lesson,
  index,
  total,
  role,
  locale,
  dir,
  level,
  device,
  isFocus,
  completedTasks,
  navLabel,
  preview,
  t,
  onCompleteTask,
  onCompleteAll,
  onBeforeLeave,
}: {
  lesson: LessonDef;
  index: number;
  total: number;
  role: UserRole;
  locale: OnboardingLocale;
  dir: "ltr" | "rtl";
  level: Level;
  device: Device;
  isFocus: boolean;
  completedTasks: ReadonlySet<string>;
  /** The sidebar label of the page this lesson is about. */
  navLabel: string;
  preview: boolean;
  t: FrameworkStrings;
  onCompleteTask: (taskId: string) => void;
  /** Escape hatch if a practice screen crashes: mark every task done. */
  onCompleteAll: () => void;
  /** Called right before leaving for the real page (saves progress). */
  onBeforeLeave: () => void;
}) {
  const text = useMemo(() => lessonTexts(lesson, role)[locale], [lesson, role, locale]);
  const L = t.lesson;
  const doneCount = text.tasks.filter((task) => completedTasks.has(task.id)).length;
  const allDone = doneCount === text.tasks.length;
  const firstOpenId = text.tasks.find((task) => !completedTasks.has(task.id))?.id ?? null;

  // Hints: "new" users get the first open task's hint after 20 s without
  // progress; everyone can open any hint with its button.
  const [autoKey, setAutoKey] = useState<string | null>(null);
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (level !== "new" || !firstOpenId) return;
    const key = `${lesson.id}:${firstOpenId}`;
    const timer = setTimeout(() => setAutoKey(key), AUTO_HINT_MS);
    return () => clearTimeout(timer);
  }, [level, lesson.id, firstOpenId, doneCount]);

  const Practice = lesson.Practice;

  return (
    <div className="space-y-7">
      <ScreenTitle
        eyebrow={fill(L.lessonOf, { n: index + 1, total })}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{text.title}</span>
            {isFocus && <Chip tone="navy">{L.yourFocus}</Chip>}
            {allDone && <Chip tone="green">{L.done}</Chip>}
          </span>
        }
        description={text.oneLiner}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="card-title">{L.whatItsFor}</h2>
          {text.what.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 dark:text-navy-100">
              {p}
            </p>
          ))}
          <p className="text-sm text-slate-700 dark:text-navy-100">
            <span className="font-medium text-slate-900 dark:text-white">{L.useWhen}</span> {text.useWhen}
          </p>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="card-title">{L.whoCanSee}</h2>
          <div className="space-y-2.5">
            <div>
              <p className="eyebrow mb-1.5">{L.seenBy}</p>
              <ul className="flex flex-wrap gap-1.5">
                {text.visibility.seenBy.map((r) => (
                  <li key={r}>
                    <Chip tone="navy">{r}</Chip>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-1.5">{L.notSeenBy}</p>
              <ul className="flex flex-wrap gap-1.5">
                {text.visibility.notSeenBy.map((r) => (
                  <li key={r}>
                    <Chip tone="slate">{r}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {text.visibility.note && <p className="text-sm text-slate-600 dark:text-navy-200">{text.visibility.note}</p>}
        </Card>
      </div>

      <section aria-labelledby="onb-try" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="onb-try" className="section-title">
            {L.tryIt}
          </h2>
          <p className="text-sm text-slate-500 dark:text-navy-300">{L.tryItNotice}</p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          {/* Checklist first in the source: above the practice on phones,
              beside it on desktop. */}
          <Card className="space-y-3 p-4 lg:sticky lg:top-36">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="card-title">{L.tasks}</h3>
              <p className="text-xs text-slate-500 dark:text-navy-300" role="status" aria-live="polite">
                {fill(L.tasksDone, { done: doneCount, total: text.tasks.length })}
              </p>
            </div>
            <ol className="space-y-3">
              {text.tasks.map((task) => {
                const done = completedTasks.has(task.id);
                const hintKey = `${lesson.id}:${task.id}`;
                const hintOpen = !done && (openHints[hintKey] || autoKey === hintKey);
                const hintId = `onb-hint-${lesson.id}-${task.id}`;
                return (
                  <li key={task.id} className="space-y-1.5">
                    <div className="flex items-start gap-2.5">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <Circle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-300 dark:text-navy-600" strokeWidth={1.75} aria-hidden="true" />
                      )}
                      <p className={cn("flex-1 text-sm", done ? "text-slate-500 dark:text-navy-300" : "text-slate-900 dark:text-white")}>
                        {task.label}
                        {done && <span className="sr-only"> ({L.taskDoneLabel})</span>}
                      </p>
                    </div>
                    {!done && (
                      <div className="ps-7">
                        <button
                          type="button"
                          aria-expanded={hintOpen}
                          aria-controls={hintId}
                          onClick={() => setOpenHints((h) => ({ ...h, [hintKey]: !hintOpen }))}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded text-sm font-medium text-navy-700 hover:text-navy-950 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-200 dark:hover:text-white"
                        >
                          <Lightbulb className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          {hintOpen ? t.common.hideHint : t.common.hint}
                        </button>
                        <p id={hintId} hidden={!hintOpen} className="mt-1 rounded-md bg-navy-50 px-3 py-2 text-sm text-navy-900 dark:bg-navy-500/15 dark:text-navy-100">
                          {task.hint}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          <div className="min-w-0">
            <PracticeBoundary
              key={lesson.id}
              fallback={(reset) => (
                <Card className="space-y-3 p-5">
                  <p className="text-sm text-slate-700 dark:text-navy-100">{L.practiceFailed}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={reset}>
                      {L.retry}
                    </Button>
                    <Button type="button" variant="secondary" onClick={onCompleteAll}>
                      {L.markDone}
                    </Button>
                  </div>
                </Card>
              )}
            >
              <Practice
                role={role}
                locale={locale}
                dir={dir}
                level={level}
                device={device}
                completedTasks={completedTasks}
                completeTask={onCompleteTask}
              />
            </PracticeBoundary>
          </div>
        </div>
      </section>

      {allDone && (
        <Card className="space-y-2 p-5">
          <h2 className="card-title">{L.whereToFind}</h2>
          <p className="text-sm text-slate-700 dark:text-navy-100">{fill(L.findInSidebar, { name: navLabel })}</p>
          <p className="text-sm text-slate-600 dark:text-navy-200">{text.whereToFind}</p>
          <p className="pt-1">
            {preview ? (
              <span className="text-sm font-medium text-slate-500 dark:text-navy-300">{L.openRealPage}</span>
            ) : (
              <Link
                href={lesson.navHref}
                onClick={onBeforeLeave}
                className="rounded text-sm font-medium text-navy-700 hover:text-navy-950 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-200 dark:hover:text-white"
              >
                {L.openRealPage}
              </Link>
            )}
          </p>
          {!preview && <p className="text-xs text-slate-500 dark:text-navy-400">{L.openRealPageNote}</p>}
        </Card>
      )}
    </div>
  );
}
