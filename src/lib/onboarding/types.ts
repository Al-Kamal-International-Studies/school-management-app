import type { ComponentType } from "react";
import type { UserRole } from "@/lib/types/database.types";

export type OnboardingLocale = "en" | "ar";

/** Every focus option offered by the "what will you do most" question. */
export type FocusTag =
  // teacher
  | "attendance"
  | "homework"
  | "examsGrades"
  | "messagingParents"
  | "timetable"
  | "remarksProgress"
  // parent (attendance is shared with teacher)
  | "grades"
  | "messages"
  | "eventsDocuments"
  // admin
  | "setup"
  | "admissions"
  | "approvals"
  | "communication"
  | "oversight";

export type Level = "new" | "some" | "expert";
export type Device = "phone" | "computer" | "both";

/** The words of one lesson in one language. */
export interface LessonText {
  /** Lesson title (usually the sidebar label). */
  title: string;
  /** One plain sentence, shown on the "app at a glance" screen. */
  oneLiner: string;
  /** "What it's for": two or three plain sentences, one string per paragraph. */
  what: string[];
  /** Finishes the sentence "You'll use this when...". */
  useWhen: string;
  /** "Who can see this": role names, already written in this language. */
  visibility: { seenBy: string[]; notSeenBy: string[]; note?: string };
  /** Practice tasks; ids are identical in en and ar. */
  tasks: { id: string; label: string; hint: string }[];
  /** Where the feature lives, e.g. "Attendance, in the sidebar". */
  whereToFind: string;
}

export interface PracticeProps {
  role: UserRole;
  locale: OnboardingLocale;
  dir: "ltr" | "rtl";
  level: Level;
  device: Device;
  completedTasks: ReadonlySet<string>;
  /** Mark a task done. Idempotent. Never throws. */
  completeTask: (taskId: string) => void;
}

export type LessonTexts = { en: LessonText; ar: LessonText };

export interface LessonDef {
  /** Unique within a role. */
  id: string;
  /** Exact sidebar href (or "/settings", "/admin/chat-oversight"). */
  navHref: string;
  /** Roles this lesson is shown to. */
  roles: UserRole[];
  /** The focus options that move this lesson to the front. */
  focusTags: FocusTag[];
  /** Onboarding version that introduced the lesson (10 for all of the first release). */
  since: number;
  /** Text, or a function when the wording differs per role. */
  text: LessonTexts | ((role: UserRole) => LessonTexts);
  /** Lazy-loaded (next/dynamic or React.lazy, ssr: false). */
  Practice: ComponentType<PracticeProps>;
  /** Only for the chat-oversight account. */
  requiresOverseer?: boolean;
}
