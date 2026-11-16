import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { FocusTag, LessonDef, PracticeProps } from "@/lib/onboarding/types";
import { adminTexts } from "./texts";

/**
 * Admin lessons: every /admin/* sidebar href, including
 * /admin/chat-oversight (requiresOverseer: shown only to the oversight account).
 */
const A: LessonDef["roles"] = ["admin"];

function lesson(
  id: string,
  navHref: string,
  Practice: ComponentType<PracticeProps>,
  focusTags: FocusTag[] = [],
  requiresOverseer?: boolean,
): LessonDef {
  const text = adminTexts[id];
  if (!text) throw new Error(`Missing admin lesson text: ${id}`);
  return { id, navHref, roles: A, focusTags, since: 10, text, Practice, requiresOverseer };
}

const Overview = dynamic(() => import("./OverviewPractice"), { ssr: false });
const Users = dynamic(() => import("./UsersPractice"), { ssr: false });
const Admissions = dynamic(() => import("./AdmissionsPractice"), { ssr: false });
const IdCards = dynamic(() => import("./IdCardsPractice"), { ssr: false });
const PasswordResets = dynamic(() => import("./PasswordResetsPractice"), { ssr: false });
const Classes = dynamic(() => import("./ClassesPractice"), { ssr: false });
const Subjects = dynamic(() => import("./SubjectsPractice"), { ssr: false });
const Timetable = dynamic(() => import("./TimetablePractice"), { ssr: false });
const Progress = dynamic(() => import("./ProgressPractice"), { ssr: false });
const Leave = dynamic(() => import("./LeavePractice"), { ssr: false });
const Events = dynamic(() => import("./EventsPractice"), { ssr: false });
const Documents = dynamic(() => import("./DocumentsPractice"), { ssr: false });
const Announcements = dynamic(() => import("./AnnouncementsPractice"), { ssr: false });
const MessageSafety = dynamic(() => import("./MessageSafetyPractice"), { ssr: false });
const ChatOversight = dynamic(() => import("./ChatOversightPractice"), { ssr: false });
const Feedback = dynamic(() => import("./FeedbackPractice"), { ssr: false });
const AuditLog = dynamic(() => import("./AuditLogPractice"), { ssr: false });

export const adminLessons: LessonDef[] = [
  lesson("overview", "/admin", Overview),
  lesson("users", "/admin/users", Users, ["setup"]),
  lesson("admissions", "/admin/admissions", Admissions, ["admissions"]),
  lesson("id-cards", "/admin/id-cards", IdCards),
  lesson("password-resets", "/admin/password-reset-requests", PasswordResets, ["approvals"]),
  lesson("classes", "/admin/classes", Classes, ["setup"]),
  lesson("subjects", "/admin/subjects", Subjects, ["setup"]),
  lesson("timetable", "/admin/timetable", Timetable, ["setup"]),
  lesson("progress", "/admin/progress", Progress, ["oversight"]),
  lesson("leave-requests", "/admin/leave-requests", Leave, ["approvals"]),
  lesson("events", "/admin/events", Events, ["communication"]),
  lesson("documents", "/admin/documents", Documents, ["communication"]),
  lesson("announcements", "/admin/announcements", Announcements, ["communication"]),
  lesson("message-safety", "/admin/message-safety", MessageSafety, ["oversight"]),
  lesson("chat-oversight", "/admin/chat-oversight", ChatOversight, ["oversight"], true),
  lesson("feedback", "/admin/feedback", Feedback, ["communication"]),
  lesson("audit-log", "/admin/audit-log", AuditLog, ["oversight"]),
];
