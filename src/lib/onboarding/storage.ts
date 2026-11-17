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
  /**
   * Which run this progress belongs to: the account's lessonsSinceFloor when
   * the run started (0 = first run; N = "what's new" or a replay after
   * finishing version N). Progress is only resumed by a run with the same
   * base, so an old first-run record can never satisfy a later run.
   */
  base: number;
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

export function emptyProgress(base = 0): Progress {
  return {
    v: 1,
    base,
    answers: { focus: [] },
    position: { chapter: "questions", question: 0, lessonId: null },
    tasks: {},
    completed: [],
    total: 0,
    updatedAt: 0,
  };
}

/*
 * Keys are independent of ONBOARDING_VERSION: a new lesson release must not
 * orphan unfinished progress (Jack's review F1). The record's own `v` is the
 * storage schema; `base` says which run it belongs to.
 */
export function storageKey(userId: string): string {
  return `onboarding:progress:${userId}`;
}

/** Keys used before the release version was separated from storage (v10 wrote these). */
export function LEGACY_STORAGE_KEYS(userId: string): string[] {
  return [`onboarding:v10:${userId}`];
}

/** sessionStorage flag: set once the flow was auto-opened or paused this session. */
export function sessionKey(userId: string): string {
  return `onboarding:session:${userId}`;
}

function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeLegacy(userId: string): void {
  for (const key of LEGACY_STORAGE_KEYS(userId)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore: it is ignored again once current progress exists
    }
  }
}

/**
 * Current progress, or (only while none exists yet) progress saved under a
 * legacy key. Reading never writes; the legacy copy is removed only after a
 * write to the current key succeeds, or when progress is cleared.
 */
export function readRaw(userId: string): string | null {
  const current = getItem(storageKey(userId));
  if (current !== null) return current;
  for (const key of LEGACY_STORAGE_KEYS(userId)) {
    const legacy = getItem(key);
    if (legacy !== null) return legacy;
  }
  return null;
}

/*
 * Result of the most recent progress write (autosave or explicit), so the UI
 * can say "saved" only while saving really works, and recovers once a later
 * write succeeds. Subscribe with useSyncExternalStore.
 */
let lastWriteOk = true;
const saveListeners = new Set<() => void>();

function setLastWrite(ok: boolean) {
  if (ok === lastWriteOk) return;
  lastWriteOk = ok;
  for (const fn of saveListeners) fn();
}

export function subscribeSaveStatus(onChange: () => void): () => void {
  saveListeners.add(onChange);
  return () => saveListeners.delete(onChange);
}

/** True when the last progress write succeeded (or none failed yet). */
export function lastSaveOk(): boolean {
  return lastWriteOk;
}

/** Returns false when the browser would not store it (the flow keeps working in memory). */
export function writeProgress(userId: string, progress: Progress): boolean {
  let ok: boolean;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ ...progress, updatedAt: Date.now() }));
    ok = true;
  } catch {
    ok = false;
  }
  if (ok) removeLegacy(userId);
  setLastWrite(ok);
  return ok;
}

export function clearProgress(userId: string): void {
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
  removeLegacy(userId);
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
      // Records written before `base` existed all came from first runs.
      base: Number.isInteger(p.base) && (p.base as number) >= 0 ? (p.base as number) : 0,
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

/** Stored progress for a run with this base, or null (absent, unreadable, or from another run). */
export function progressForRun(raw: string | null, base: number): Progress | null {
  const p = parseProgress(raw);
  return p && p.base === base ? p : null;
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

/**
 * Forgets every "already opened this session" flag in this tab. Called on
 * sign-out and on the sign-in page, so signing in again in the same tab
 * auto-opens unfinished onboarding again. Saved progress (localStorage) is kept.
 */
export function clearSessionFlags(): void {
  try {
    const store = window.sessionStorage;
    for (const key of Object.keys(store)) {
      if (key.startsWith("onboarding:") && key.includes(":session:")) store.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/** Where the flow sends people back to: a same-site path, never the flow itself. */
export function safeReturnPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return null;
  if (next === "/getting-started" || next.startsWith("/getting-started?") || next.startsWith("/getting-started/") || next.startsWith("/getting-started#")) return null;
  return next;
}

/** /getting-started, remembering the page to come back to. */
export function gettingStartedHref(returnTo: string | null | undefined): string {
  const safe = safeReturnPath(returnTo);
  return safe ? `/getting-started?next=${encodeURIComponent(safe)}` : "/getting-started";
}
