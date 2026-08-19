import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

/**
 * Where a step points:
 * - "center": no real element (the welcome step) — the tooltip is centered
 *   in the viewport with a plain dimmed backdrop, no spotlight ring.
 * - "nav": a sidebar nav item, matched via the `data-tour-nav` attribute
 *   Sidebar.tsx stamps on every item using its own `href` (see
 *   NAV_ITEMS in Sidebar.tsx — these hrefs must stay in sync, and if a nav
 *   item is ever renamed/removed, TypeScript won't catch it, but
 *   TourOverlay's "element not found" fallback (center-screen, no ring)
 *   means a stale href degrades gracefully instead of breaking the tour).
 * - "element": any other real DOM node carrying a `data-tour="<id>"`
 *   attribute — currently just each role's own dashboard `<h1>`.
 */
export type TourStepTarget =
  | { kind: "center" }
  | { kind: "nav"; href: string }
  | { kind: "element"; selector: string };

export interface TourStep {
  id: string;
  target: TourStepTarget;
  title: (dict: Dictionary) => string;
  body: (dict: Dictionary) => string;
  /** See CURRENT_TOUR_VERSION below. */
  version: number;
}

/**
 * Bump this, and tag the new/changed step(s) below with the new number,
 * every time a shipped feature needs a tour step added or meaningfully
 * changed. This is what makes the "what's new" mechanism in
 * TourProvider.tsx actually work: an account that already finished the tour
 * (has_seen_tour = true) but whose `profile.tour_version_seen` is behind
 * this number gets shown, automatically on next login, just the step(s)
 * whose `version` is newer than what they've already seen — not the whole
 * tour again, and not silence either. See HANDOVER.md's standing rule
 * ("keep the tour current") — this is the one line of code that rule
 * actually means in practice.
 *
 * History: 1 = the original per-role tour (Part 6). 2 = Class Chat, added
 * for teacher/student (Part 9).
 */
export const CURRENT_TOUR_VERSION = 2;

function step(
  id: string,
  target: TourStepTarget,
  pick: (dict: Dictionary) => { title: string; body: string },
  version = 1
): TourStep {
  return { id, target, title: (dict) => pick(dict).title, body: (dict) => pick(dict).body, version };
}

const welcomeStep = (role: UserRole): TourStep => step("welcome", { kind: "center" }, (dict) => dict.tour.welcome[role]);

/**
 * One step list per role, tailored to what that role's own sidebar and
 * dashboard actually contain (cross-checked against Sidebar.tsx's
 * NAV_ITEMS and each role's overview page under src/app/(dashboard)).
 * Every "nav" step's href is a real, currently-existing route for that
 * role — nothing here is aspirational.
 */
export const TOUR_STEPS: Record<UserRole, TourStep[]> = {
  admin: [
    welcomeStep("admin"),
    step("overview", { kind: "element", selector: '[data-tour="page-title"]' }, (d) => d.tour.steps.admin.overview),
    step("users", { kind: "nav", href: "/admin/users" }, (d) => d.tour.steps.admin.users),
    step("classes", { kind: "nav", href: "/admin/classes" }, (d) => d.tour.steps.admin.classes),
    step("subjects", { kind: "nav", href: "/admin/subjects" }, (d) => d.tour.steps.admin.subjects),
    step("timetable", { kind: "nav", href: "/admin/timetable" }, (d) => d.tour.steps.admin.timetable),
    step("progress", { kind: "nav", href: "/admin/progress" }, (d) => d.tour.steps.admin.progress),
    step("leave", { kind: "nav", href: "/admin/leave-requests" }, (d) => d.tour.steps.admin.leave),
    step("announcements", { kind: "nav", href: "/admin/announcements" }, (d) => d.tour.steps.admin.announcements),
    step("auditLog", { kind: "nav", href: "/admin/audit-log" }, (d) => d.tour.steps.admin.auditLog),
    step("settings", { kind: "nav", href: "/settings" }, (d) => d.tour.steps.admin.settings),
  ],
  teacher: [
    welcomeStep("teacher"),
    step("myClasses", { kind: "element", selector: '[data-tour="page-title"]' }, (d) => d.tour.steps.teacher.myClasses),
    step("classChat", { kind: "nav", href: "/class-chat" }, (d) => d.tour.steps.teacher.classChat, 2),
    step("timetable", { kind: "nav", href: "/teacher/timetable" }, (d) => d.tour.steps.teacher.timetable),
    step("attendance", { kind: "nav", href: "/teacher/attendance" }, (d) => d.tour.steps.teacher.attendance),
    step("assignments", { kind: "nav", href: "/teacher/assignments" }, (d) => d.tour.steps.teacher.assignments),
    step("exams", { kind: "nav", href: "/teacher/exams" }, (d) => d.tour.steps.teacher.exams),
    step("grades", { kind: "nav", href: "/teacher/grades" }, (d) => d.tour.steps.teacher.grades),
    step("remarks", { kind: "nav", href: "/teacher/remarks" }, (d) => d.tour.steps.teacher.remarks),
    step("settings", { kind: "nav", href: "/settings" }, (d) => d.tour.steps.teacher.settings),
  ],
  student: [
    welcomeStep("student"),
    step("dashboard", { kind: "element", selector: '[data-tour="page-title"]' }, (d) => d.tour.steps.student.dashboard),
    step("classChat", { kind: "nav", href: "/class-chat" }, (d) => d.tour.steps.student.classChat, 2),
    step("timetable", { kind: "nav", href: "/student/timetable" }, (d) => d.tour.steps.student.timetable),
    step("attendance", { kind: "nav", href: "/student/attendance" }, (d) => d.tour.steps.student.attendance),
    step("assignments", { kind: "nav", href: "/student/assignments" }, (d) => d.tour.steps.student.assignments),
    step("exams", { kind: "nav", href: "/student/exams" }, (d) => d.tour.steps.student.exams),
    step("grades", { kind: "nav", href: "/student/grades" }, (d) => d.tour.steps.student.grades),
    step("leave", { kind: "nav", href: "/student/leave" }, (d) => d.tour.steps.student.leave),
    step("settings", { kind: "nav", href: "/settings" }, (d) => d.tour.steps.student.settings),
  ],
  parent: [
    welcomeStep("parent"),
    step("dashboard", { kind: "element", selector: '[data-tour="page-title"]' }, (d) => d.tour.steps.parent.dashboard),
    step("calendar", { kind: "nav", href: "/calendar" }, (d) => d.tour.steps.parent.calendar),
    step("documents", { kind: "nav", href: "/documents" }, (d) => d.tour.steps.parent.documents),
    step("messages", { kind: "nav", href: "/messages" }, (d) => d.tour.steps.parent.messages),
    step("settings", { kind: "nav", href: "/settings" }, (d) => d.tour.steps.parent.settings),
  ],
};
