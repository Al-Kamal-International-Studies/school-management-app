import type { UserRole } from "@/lib/types/database.types";
import type { FocusTag, LessonDef, LessonTexts } from "./types";
import { sharedLessons } from "@/components/onboarding/lessons/shared";
import { teacherLessons } from "@/components/onboarding/lessons/teacher";
import { adminLessons } from "@/components/onboarding/lessons/admin";
import { studentParentLessons } from "@/components/onboarding/lessons/student-parent";

/** Every lesson, from the four owned index files. Add lessons there, not here. */
export const ALL_LESSONS: LessonDef[] = [...sharedLessons, ...teacherLessons, ...adminLessons, ...studentParentLessons];

export function lessonTexts(def: LessonDef, role: UserRole): LessonTexts {
  return typeof def.text === "function" ? def.text(role) : def.text;
}

/**
 * The lessons one person can see, in no particular order.
 * `sinceFloor`: only lessons with `since` greater than this (what's new).
 */
export function lessonsForRole(
  role: UserRole,
  opts: { canOverseeChats: boolean; sinceFloor?: number },
): LessonDef[] {
  const floor = opts.sinceFloor ?? 0;
  return ALL_LESSONS.filter(
    (l) => l.roles.includes(role) && (!l.requiresOverseer || opts.canOverseeChats) && l.since > floor,
  );
}

/**
 * Lessons matching any chosen focus tag first, then the rest; both groups in
 * sidebar order. `navOrder` is the list of sidebar hrefs in display order
 * (hrefs not in it go last, in registry order).
 */
export function orderLessons(lessons: LessonDef[], focus: readonly FocusTag[], navOrder: readonly string[]): LessonDef[] {
  const rank = (l: LessonDef) => {
    const i = navOrder.indexOf(l.navHref);
    return i === -1 ? navOrder.length : i;
  };
  const matches = (l: LessonDef) => l.focusTags.some((t) => focus.includes(t));
  return lessons
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const fa = matches(a.l) ? 0 : 1;
      const fb = matches(b.l) ? 0 : 1;
      return fa - fb || rank(a.l) - rank(b.l) || a.i - b.i;
    })
    .map((x) => x.l);
}
