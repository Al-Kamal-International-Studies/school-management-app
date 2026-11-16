import { ONBOARDING_VERSION } from "./version";
import type { Device, FocusTag, Level, OnboardingLocale } from "./types";

/**
 * Progress lives on the device only (localStorage). Every access is wrapped
 * in try/catch: private browsing, blocked storage or a full quota must never
 * stop the flow, which then simply works in memory for the page's lifetime.
 */

export type Chapter = "questions" | "glance" | "lessons" | "privacy" | "finish";

export interface Answers {
  language?: OnboardingLocale;
  look?: "light" | "dark";
  device?: Device;
  level?: Level;
  focus: FocusTag[];
}

export interface Position {
  chapter: Chapter;
  /** Index into the role's question list (chapter "questions"). */
  question: number;
  /** Lesson id (chapter "lessons"). */
  lessonId: string | null;
}

export interface Progress {
  v: 1;
  answers: Answers;
  position: Position;
  /** Completed task ids per lesson id. */
  tasks: Record<string, string[]>;
  /** Lesson ids whose tasks are all done. */
  completed: string[];
  /** How many lessons this person has (for the banner's "X of Y"). */
  total: number;
  updatedAt: number;
}

export function emptyProgress(): Progress {
  return {
    v: 1,
    answers: { focus: [] },
    position: { chapter: "questions", question: 0, lessonId: null },
    tasks: {},
    completed: [],
    total: 0,
    updatedAt: 0,
  };
}

export function storageKey(userId: string): string {
  return `onboarding:v${ONBOARDING_VERSION}:${userId}`;
}

/** sessionStorage flag: set once the flow was auto-opened or paused this session. */
export function sessionKey(userId: string): string {
  return `onboarding:v${ONBOARDING_VERSION}:session:${userId}`;
}

export function readRaw(userId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function writeProgress(userId: string, progress: Progress): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ ...progress, updatedAt: Date.now() }));
  } catch {
    // storage unavailable: the flow keeps working in memory
  }
}

export function clearProgress(userId: string): void {
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

const CHAPTERS: Chapter[] = ["questions", "glance", "lessons", "privacy", "finish"];

/** Parses stored JSON defensively; anything unexpected yields null. */
export function parseProgress(raw: string | null): Progress | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Progress> | null;
    if (!p || p.v !== 1 || typeof p.position !== "object" || !p.position) return null;
    if (!CHAPTERS.includes(p.position.chapter as Chapter)) return null;
    const base = emptyProgress();
    return {
      v: 1,
      answers: { ...base.answers, ...(p.answers ?? {}), focus: Array.isArray(p.answers?.focus) ? p.answers.focus : [] },
      position: {
        chapter: p.position.chapter,
        question: Number.isInteger(p.position.question) ? Math.max(0, p.position.question) : 0,
        lessonId: typeof p.position.lessonId === "string" ? p.position.lessonId : null,
      },
      tasks: p.tasks && typeof p.tasks === "object" ? p.tasks : {},
      completed: Array.isArray(p.completed) ? p.completed : [],
      total: typeof p.total === "number" ? p.total : 0,
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function markSessionHandled(userId: string): void {
  try {
    window.sessionStorage.setItem(sessionKey(userId), "1");
  } catch {
    // ignore
  }
}

export function sessionHandled(userId: string): boolean {
  try {
    return window.sessionStorage.getItem(sessionKey(userId)) === "1";
  } catch {
    // Can't remember within the session: never redirect (no loop risk).
    return true;
  }
}
