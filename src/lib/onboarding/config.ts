import type { UserRole } from "@/lib/types/database.types";
import type { Device, FocusTag, Level } from "./types";

export const MAX_FOCUS = 3;

/** Where each role lands after the flow (same as dashboardPathForRole in lib/auth.ts, which is server-only). */
export const DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

export const FOCUS_OPTIONS: Record<UserRole, FocusTag[]> = {
  teacher: ["attendance", "homework", "examsGrades", "messagingParents", "timetable", "remarksProgress"],
  parent: ["grades", "attendance", "messages", "eventsDocuments"],
  student: ["timetable", "homework", "grades", "messages"],
  admin: ["setup", "admissions", "approvals", "communication", "oversight"],
};

export type QuestionId = "language" | "look" | "device" | "level" | "focus";

/** Students are not asked about experience (they default to "new"). */
export function questionsFor(role: UserRole): QuestionId[] {
  return role === "student"
    ? ["language", "look", "device", "focus"]
    : ["language", "look", "device", "level", "focus"];
}

export const DEVICES: Device[] = ["phone", "computer", "both"];
export const LEVELS: Level[] = ["new", "some", "expert"];

export type GroupId =
  | "teaching" | "classLife" | "talking" | "help"
  | "people" | "setup" | "comms" | "records"
  | "today" | "school" | "child" | "more";

/**
 * "App at a glance" groups, per role, as lists of sidebar hrefs. Any sidebar
 * item not listed lands in "more", so a new nav item still shows up.
 */
export const GLANCE_GROUPS: Record<UserRole, { id: GroupId; hrefs: string[] }[]> = {
  teacher: [
    { id: "teaching", hrefs: ["/teacher", "/teacher/timetable", "/teacher/timetable-builder", "/teacher/attendance", "/teacher/assignments", "/teacher/exams", "/teacher/grades"] },
    { id: "classLife", hrefs: ["/teacher/remarks", "/teacher/progress", "/teacher/id-cards", "/calendar", "/documents"] },
    { id: "talking", hrefs: ["/messages"] },
    { id: "help", hrefs: ["/chatbot", "/feedback", "/settings"] },
  ],
  admin: [
    { id: "people", hrefs: ["/admin/users", "/admin/admissions", "/admin/id-cards", "/admin/password-reset-requests"] },
    { id: "setup", hrefs: ["/admin", "/admin/classes", "/admin/subjects", "/admin/timetable", "/admin/progress", "/admin/leave-requests"] },
    { id: "comms", hrefs: ["/admin/events", "/admin/documents", "/admin/announcements", "/messages", "/admin/message-safety", "/admin/chat-oversight", "/admin/feedback"] },
    { id: "records", hrefs: ["/admin/audit-log", "/settings"] },
  ],
  student: [
    { id: "today", hrefs: ["/student", "/student/timetable", "/student/attendance", "/student/assignments", "/student/exams", "/student/grades"] },
    { id: "school", hrefs: ["/student/id-card", "/student/leave", "/calendar", "/documents"] },
    { id: "talking", hrefs: ["/messages"] },
    { id: "help", hrefs: ["/chatbot", "/feedback", "/settings"] },
  ],
  parent: [
    { id: "child", hrefs: ["/parent", "/parent/id-card"] },
    { id: "school", hrefs: ["/calendar", "/documents"] },
    { id: "talking", hrefs: ["/messages"] },
    { id: "help", hrefs: ["/chatbot", "/feedback", "/settings"] },
  ],
};
