"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SETTINGS_ITEM, navItemsFor } from "@/components/nav/Sidebar";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { setLocaleCookie } from "@/lib/i18n/setLocaleCookie";
import { dirForLocale } from "@/lib/i18n/locales";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { markOnboardingCompleteAction } from "@/lib/onboarding/actions";
import { DASHBOARD_PATH, questionsFor } from "@/lib/onboarding/config";
import { fill, framework } from "@/lib/onboarding/i18n/framework";
import { lessonTexts, lessonsForRole, orderLessons } from "@/lib/onboarding/registry";
import {
  canStoreProgress,
  clearProgress,
  emptyProgress,
  markSessionHandled,
  parseProgress,
  readRaw,
  writeProgress,
  type Position,
  type Progress,
} from "@/lib/onboarding/storage";
import type { Device, FocusTag, Level, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";
import { FinishScreen } from "./FinishScreen";
import { GlanceScreen } from "./Glance";
import { LessonDrawer } from "./LessonDrawer";
import { LessonScreen } from "./LessonScreen";
import { PrivacyScreen } from "./PrivacyScreen";
import { QuestionScreen, isQuestionAnswered } from "./Questions";

export interface OnboardingFlowProps {
  userId: string;
  role: UserRole;
  /** Adds the Chat oversight lesson (the oversight account only). */
  canOverseeChats: boolean;
  /**
   * "What's new" floor, computed on the server: 0 = the full flow (first time,
   * or a voluntary replay by someone who is up to date); above 0 = this person
   * is behind and sees only lessons newer than that version.
   */
  sinceFloor: number;
  /** Same-site page to return to on "Continue later" and Finish; null = the role's dashboard. */
  returnTo?: string | null;
  /** Dev preview: never calls the server action and never leaves the page. */
  preview?: boolean;
}

type Step =
  | { kind: "question"; question: number }
  | { kind: "glance" }
  | { kind: "lesson"; lessonId: string }
  | { kind: "privacy" }
  | { kind: "finish" };

const CHAPTER_OF: Record<Step["kind"], number> = { question: 0, glance: 1, lesson: 2, privacy: 3, finish: 4 };

function stepKey(s: Step): string {
  return s.kind === "question" ? `q${s.question}` : s.kind === "lesson" ? `l:${s.lessonId}` : s.kind;
}

function positionOf(s: Step): Position {
  switch (s.kind) {
    case "question":
      return { chapter: "questions", question: s.question, lessonId: null };
    case "lesson":
      return { chapter: "lessons", question: 0, lessonId: s.lessonId };
    case "glance":
      return { chapter: "glance", question: 0, lessonId: null };
    case "privacy":
      return { chapter: "privacy", question: 0, lessonId: null };
    case "finish":
      return { chapter: "finish", question: 0, lessonId: null };
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
const subscribeNothing = () => () => {};

export function OnboardingFlow({ userId, role, canOverseeChats, sinceFloor, returnTo = null, preview = false }: OnboardingFlowProps) {
  const { locale, dict } = useLocale();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const t = framework[locale];
  const dir = dirForLocale(locale);

  /* ------------------------------ progress state ------------------------------ */
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const storageWorks = useSyncExternalStore(subscribeNothing, canStoreProgress, () => true);
  const raw = useSyncExternalStore(subscribeStorage, () => readRaw(userId), () => null);
  const stored = useMemo(() => parseProgress(raw), [raw]);
  const blank = useMemo(() => emptyProgress(), []);
  const [override, setOverride] = useState<Progress | null>(null);
  const progress = override ?? stored ?? blank;

  const update = useCallback(
    (fn: (p: Progress) => Progress) => {
      setOverride((prev) => {
        const base = prev ?? stored ?? blank;
        const next = fn(base);
        return next === base ? prev : next;
      });
    },
    [stored, blank],
  );

  /* --------------------------------- the steps -------------------------------- */
  const whatsNew = sinceFloor > 0;
  const navItems = useMemo(() => [...navItemsFor(role, canOverseeChats), SETTINGS_ITEM], [role, canOverseeChats]);
  const focus = progress.answers.focus;
  const lessons = useMemo(
    () => orderLessons(lessonsForRole(role, { canOverseeChats, sinceFloor }), focus, navItems.map((i) => i.href)),
    [role, canOverseeChats, sinceFloor, focus, navItems],
  );
  const questions = useMemo(() => questionsFor(role), [role]);

  const steps = useMemo<Step[]>(() => {
    const lessonSteps: Step[] = lessons.map((l) => ({ kind: "lesson", lessonId: l.id }));
    if (whatsNew) return [...lessonSteps, { kind: "finish" }];
    return [
      ...questions.map((_, question): Step => ({ kind: "question", question })),
      { kind: "glance" },
      ...lessonSteps,
      { kind: "privacy" },
      { kind: "finish" },
    ];
  }, [lessons, questions, whatsNew]);

  const stepIndex = useMemo(() => {
    const pos = progress.position;
    const found = steps.findIndex((s) => {
      if (pos.chapter === "questions") return s.kind === "question" && s.question === pos.question;
      if (pos.chapter === "lessons") return s.kind === "lesson" && s.lessonId === pos.lessonId;
      return s.kind === pos.chapter;
    });
    if (found >= 0) return found;
    return pos.chapter === "lessons" ? Math.max(0, steps.findIndex((s) => s.kind === "lesson")) : 0;
  }, [steps, progress.position]);
  const step = steps[stepIndex]!;
  const currentKey = stepKey(step);

  // The furthest step reached since this page loaded, so a language switch from
  // the language question (which reloads) can resume where the person was if
  // they came Back to it from later in the flow.
  const furthest = useRef(0);
  useEffect(() => {
    furthest.current = Math.max(furthest.current, stepIndex);
  }, [stepIndex]);

  const goTo = useCallback((s: Step) => update((p) => ({ ...p, position: positionOf(s) })), [update]);

  /* ----------------------------- persistence + flags ---------------------------- */
  useEffect(() => {
    if (override) writeProgress(userId, { ...override, total: lessons.length });
  }, [override, userId, lessons.length]);

  const seeded = useRef(false);
  useEffect(() => {
    // Opening the flow counts as "started this session" (no more auto-redirects)
    // and records how many lessons there are for the dashboard banner.
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    markSessionHandled(userId);
    if (raw === null) writeProgress(userId, { ...blank, total: lessons.length });
  }, [hydrated, raw, userId, blank, lessons.length]);

  // Move focus to the screen and scroll to the top whenever the step changes.
  const mainRef = useRef<HTMLElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [currentKey]);

  /* --------------------------------- handlers --------------------------------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const [finishing, setFinishing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [languageNote, setLanguageNote] = useState(false);
  // Set when a save failed just before leaving: the page we were about to open.
  const [unsavedLeave, setUnsavedLeave] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const exitPath = returnTo ?? DASHBOARD_PATH[role];

  function chooseLanguage(code: OnboardingLocale) {
    if (code === locale) {
      update((p) => ({ ...p, answers: { ...p.answers, language: code } }));
      return;
    }
    // Save first, then switch the way the rest of the app does (cookie + a
    // full page load). During the first pass the flow resumes at the question
    // after the language; if the person came Back to it, at the furthest step
    // they had reached.
    const afterLanguage = Math.min(questions.indexOf("language") + 1, questions.length - 1);
    const resumeStep = steps[furthest.current];
    const position: Position =
      resumeStep && furthest.current > afterLanguage
        ? positionOf(resumeStep)
        : { chapter: "questions", question: afterLanguage, lessonId: null };
    const next: Progress = {
      ...progress,
      answers: { ...progress.answers, language: code },
      position,
      total: lessons.length,
    };
    if (!writeProgress(userId, next)) {
      // Storage is blocked: a reload would lose everything, so stay put.
      setLanguageNote(true);
      return;
    }
    setLocaleCookie(code);
    const url = new URL(window.location.href);
    if (url.searchParams.has("locale")) url.searchParams.set("locale", code); // dev preview
    window.location.href = url.toString();
  }

  function chooseLook(v: "light" | "dark") {
    setTheme(v);
    update((p) => ({ ...p, answers: { ...p.answers, look: v } }));
  }

  const chooseDevice = (v: Device) => update((p) => ({ ...p, answers: { ...p.answers, device: v } }));
  const chooseLevel = (v: Level) => update((p) => ({ ...p, answers: { ...p.answers, level: v } }));
  const chooseFocus = (tags: FocusTag[]) => update((p) => ({ ...p, answers: { ...p.answers, focus: tags } }));

  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const activeLesson = step.kind === "lesson" ? lessonById.get(step.lessonId) ?? null : null;

  const markTasks = useCallback(
    (lessonId: string, taskIds: string[], allIds: string[]) => {
      update((p) => {
        const have = p.tasks[lessonId] ?? [];
        const add = taskIds.filter((id) => allIds.includes(id) && !have.includes(id));
        if (!add.length) return p;
        const nextTasks = [...have, ...add];
        const done = allIds.every((id) => nextTasks.includes(id));
        return {
          ...p,
          tasks: { ...p.tasks, [lessonId]: nextTasks },
          completed: done && !p.completed.includes(lessonId) ? [...p.completed, lessonId] : p.completed,
        };
      });
    },
    [update],
  );

  const completedLessons = useMemo(() => new Set(progress.completed), [progress.completed]);
  const activeTasks = useMemo(() => new Set(activeLesson ? progress.tasks[activeLesson.id] ?? [] : []), [activeLesson, progress.tasks]);
  const activeText = activeLesson ? lessonTexts(activeLesson, role)[locale] : null;
  const lessonDone = !!activeText && activeText.tasks.every((task) => activeTasks.has(task.id));

  const qid = step.kind === "question" ? questions[step.question]! : null;
  const canNext =
    step.kind === "question" ? isQuestionAnswered(qid!, progress.answers) : step.kind === "lesson" ? lessonDone : true;
  const isFirst = stepIndex === 0;
  const isFinish = step.kind === "finish";

  function next() {
    const target = steps[stepIndex + 1];
    if (canNext && target) goTo(target);
  }
  function back() {
    const target = steps[stepIndex - 1];
    if (target) goTo(target);
  }

  function saveNow(): boolean {
    const ok = writeProgress(userId, { ...progress, total: lessons.length });
    markSessionHandled(userId);
    if (!ok) setSaveFailed(true);
    return ok;
  }

  function pause() {
    const ok = saveNow();
    if (preview) {
      if (!ok) setUnsavedLeave(exitPath);
      return;
    }
    if (!ok) {
      setUnsavedLeave(exitPath);
      return;
    }
    router.push(exitPath);
  }

  /** "Open the real page": true lets the link navigate; false keeps the person here and explains. */
  function beforeLeave(href: string): boolean {
    if (saveNow()) return true;
    setUnsavedLeave(href);
    return false;
  }

  function leaveAnyway() {
    const href = unsavedLeave;
    setUnsavedLeave(null);
    if (!href || preview) return;
    router.push(href);
  }

  const remainingLessons = lessons.filter((l) => !completedLessons.has(l.id));

  async function finish() {
    setFailed(false);
    if (remainingLessons.length > 0) return;
    if (preview) {
      setPreviewDone(true);
      return;
    }
    setFinishing(true);
    let ok = false;
    try {
      ok = (await markOnboardingCompleteAction()).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setFailed(true);
      setFinishing(false);
      return;
    }
    clearProgress(userId);
    markSessionHandled(userId);
    // Full load so the dashboard layout re-reads the profile.
    window.location.assign(exitPath);
  }

  /* ----------------------------------- view ----------------------------------- */
  const chapter = CHAPTER_OF[step.kind];
  const chapterName = whatsNew ? t.header.whatsNew : t.header.chapters[chapter]!;
  const chapterLabel = whatsNew
    ? t.header.whatsNew
    : fill(t.header.chapterLabel, { n: chapter + 1, total: t.header.chapters.length, name: chapterName });
  const level: Level = role === "student" ? "new" : progress.answers.level ?? "new";
  const device: Device = progress.answers.device ?? "both";
  const lessonIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const navLabelFor = (href: string, fallback: string) => {
    const item = navItems.find((i) => i.href === href);
    return item ? dict.nav[item.labelKey] : fallback;
  };

  let screen: React.ReactNode = null;
  if (!hydrated) {
    screen = (
      <p className="text-sm text-slate-500 dark:text-navy-300" role="status">
        {t.common.loading}
      </p>
    );
  } else if (step.kind === "question") {
    screen = (
      <QuestionScreen
        id={qid!}
        index={step.question}
        total={questions.length}
        role={role}
        answers={progress.answers}
        locale={locale}
        theme={theme}
        t={t}
        onLanguage={chooseLanguage}
        onLook={chooseLook}
        onDevice={chooseDevice}
        onLevel={chooseLevel}
        onFocus={chooseFocus}
      />
    );
  } else if (step.kind === "glance") {
    screen = (
      <GlanceScreen
        role={role}
        items={navItems}
        lessons={lessons}
        locale={locale}
        dict={dict}
        t={t}
        onOpenLesson={(lessonId) => goTo({ kind: "lesson", lessonId })}
      />
    );
  } else if (step.kind === "lesson" && activeLesson && activeText) {
    const allIds = activeText.tasks.map((x) => x.id);
    screen = (
      <LessonScreen
        lesson={activeLesson}
        index={lessonIndex}
        total={lessons.length}
        role={role}
        locale={locale}
        dir={dir}
        level={level}
        device={device}
        isFocus={activeLesson.focusTags.some((tag) => focus.includes(tag))}
        completedTasks={activeTasks}
        navLabel={navLabelFor(activeLesson.navHref, activeText.title)}
        preview={preview}
        t={t}
        onCompleteTask={(taskId) => markTasks(activeLesson.id, [taskId], allIds)}
        onCompleteAll={() => markTasks(activeLesson.id, allIds, allIds)}
        progressSaved={storageWorks && !saveFailed}
        onBeforeLeave={beforeLeave}
      />
    );
  } else if (step.kind === "privacy") {
    screen = <PrivacyScreen role={role} t={t} />;
  } else if (step.kind === "finish") {
    screen = (
      <FinishScreen
        role={role}
        device={progress.answers.device}
        lessons={lessons}
        completed={completedLessons}
        locale={locale}
        preview={preview}
        previewDone={previewDone}
        finishing={finishing}
        failed={failed}
        remaining={remainingLessons.length}
        t={t}
        onFinish={finish}
        onJumpToRemaining={() => {
          const first = remainingLessons[0];
          if (first) goTo({ kind: "lesson", lessonId: first.id });
        }}
      />
    );
  } else if (step.kind === "lesson") {
    screen = <p className="text-sm text-slate-500 dark:text-navy-300">{t.lesson.noLessons}</p>;
  }

  return (
    <div
      dir={dir}
      lang={locale}
      data-onboarding-root
      data-role={role}
      className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-800 dark:bg-navy-950 dark:text-navy-50"
    >
      <a
        href="#onboarding-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-navy-900 focus:shadow-overlay focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 dark:focus:bg-navy-900 dark:focus:text-white"
      >
        {t.common.skipToContent}
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Logo showWordmark={false} onLight className="sm:hidden" />
          <Logo onLight className="hidden sm:flex" />
          <div className="min-w-0 flex-1 ps-1 sm:ps-4">
            <p className="hidden truncate text-sm font-semibold text-slate-900 sm:block dark:text-white">{t.header.title}</p>
            <p className="text-sm font-medium leading-snug text-slate-900 sm:truncate sm:text-xs sm:font-normal sm:text-slate-500 dark:text-white sm:dark:text-navy-300">
              {chapterLabel}
            </p>
          </div>
          {lessons.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
              className="btn-secondary px-3"
            >
              <List className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t.common.lessonList}</span>
            </button>
          )}
          <Button type="button" variant="secondary" onClick={pause}>
            {t.common.continueLater}
          </Button>
        </div>
        <ol className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-1 px-4 pb-2 sm:px-6" aria-label={t.header.title}>
          {t.header.chapters.map((name, i) => (
            <li
              key={name}
              aria-current={i === chapter ? "step" : undefined}
              className={cn("h-1 rounded-full", i <= chapter ? "bg-navy-900 dark:bg-navy-200" : "bg-slate-200 dark:bg-navy-700")}
            >
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ol>
        {preview && (
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-center text-xs text-slate-500 dark:border-navy-800 dark:bg-navy-950 dark:text-navy-300">
            {t.common.previewNotice}
          </p>
        )}
      </header>

      <main
        id="onboarding-main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 focus:outline-none sm:px-6 sm:pt-8"
      >
        <div key={currentKey} className="animate-fade-in">
          {screen}
          {languageNote && step.kind === "question" && (
            <p className="mt-4 max-w-3xl text-sm text-slate-600 dark:text-navy-200" role="status">
              {t.common.languageNoStorage}
            </p>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900">
        {unsavedLeave && (
          <div
            role="alert"
            className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <p className="min-w-0 flex-1 basis-60">{t.common.notSaved}</p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" onClick={() => setUnsavedLeave(null)}>
                {t.common.stayHere}
              </Button>
              <Button type="button" onClick={leaveAnyway}>
                {t.common.leaveAnyway}
              </Button>
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          {isFirst ? (
            <span className="w-0" aria-hidden="true" />
          ) : (
            <Button type="button" variant="secondary" onClick={back}>
              {t.common.back}
            </Button>
          )}
          <p id="onb-next-hint" className="min-w-0 flex-1 text-center text-xs text-slate-500 dark:text-navy-300">
            {step.kind === "lesson" && !lessonDone
              ? t.lesson.nextLocked
              : fill(t.common.stepOf, { n: stepIndex + 1, total: steps.length })}
          </p>
          {!isFinish && (
            <Button type="button" onClick={next} disabled={!canNext} aria-describedby="onb-next-hint">
              {t.common.next}
            </Button>
          )}
        </div>
      </footer>

      {drawerOpen && (
        <LessonDrawer
          lessons={lessons}
          currentId={activeLesson?.id ?? null}
          completed={completedLessons}
          focus={focus}
          role={role}
          locale={locale}
          dir={dir}
          t={t}
          onSelect={(lessonId) => {
            setDrawerOpen(false);
            goTo({ kind: "lesson", lessonId });
          }}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
