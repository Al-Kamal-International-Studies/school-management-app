import type { LessonDef } from "@/lib/onboarding/types";
import { stubLesson } from "../stub";

/**
 * Admin lessons: every /admin/* sidebar href, including
 * /admin/chat-oversight (requiresOverseer: shown only to the oversight account).
 * Replace each stub with a real LessonDef; keep the id and navHref.
 */
const A: LessonDef["roles"] = ["admin"];

export const adminLessons: LessonDef[] = [
  stubLesson({ id: "overview", navHref: "/admin", roles: A, titleEn: "Overview", titleAr: "نظرة عامة" }),
  stubLesson({ id: "users", navHref: "/admin/users", roles: A, focusTags: ["setup"], titleEn: "Users", titleAr: "المستخدمون" }),
  stubLesson({ id: "admissions", navHref: "/admin/admissions", roles: A, focusTags: ["admissions"], titleEn: "Admissions", titleAr: "القبول" }),
  stubLesson({ id: "id-cards", navHref: "/admin/id-cards", roles: A, titleEn: "ID cards", titleAr: "بطاقات الهوية" }),
  stubLesson({ id: "password-resets", navHref: "/admin/password-reset-requests", roles: A, focusTags: ["approvals"], titleEn: "Password resets", titleAr: "إعادة تعيين كلمات المرور" }),
  stubLesson({ id: "classes", navHref: "/admin/classes", roles: A, focusTags: ["setup"], titleEn: "Classes", titleAr: "الصفوف" }),
  stubLesson({ id: "subjects", navHref: "/admin/subjects", roles: A, focusTags: ["setup"], titleEn: "Subjects", titleAr: "المواد" }),
  stubLesson({ id: "timetable", navHref: "/admin/timetable", roles: A, focusTags: ["setup"], titleEn: "Timetable", titleAr: "الجدول الدراسي" }),
  stubLesson({ id: "progress", navHref: "/admin/progress", roles: A, focusTags: ["oversight"], titleEn: "Progress", titleAr: "التقدم" }),
  stubLesson({ id: "leave-requests", navHref: "/admin/leave-requests", roles: A, focusTags: ["approvals"], titleEn: "Leave requests", titleAr: "طلبات الإجازة" }),
  stubLesson({ id: "events", navHref: "/admin/events", roles: A, focusTags: ["communication"], titleEn: "Calendar", titleAr: "التقويم" }),
  stubLesson({ id: "documents", navHref: "/admin/documents", roles: A, focusTags: ["communication"], titleEn: "Documents", titleAr: "المستندات" }),
  stubLesson({ id: "announcements", navHref: "/admin/announcements", roles: A, focusTags: ["communication"], titleEn: "Announcements", titleAr: "الإعلانات" }),
  stubLesson({ id: "message-safety", navHref: "/admin/message-safety", roles: A, focusTags: ["oversight"], titleEn: "Message safety", titleAr: "أمان الرسائل" }),
  stubLesson({ id: "chat-oversight", navHref: "/admin/chat-oversight", roles: A, focusTags: ["oversight"], titleEn: "Chat oversight", titleAr: "الإشراف على المحادثات", requiresOverseer: true }),
  stubLesson({ id: "feedback", navHref: "/admin/feedback", roles: A, focusTags: ["communication"], titleEn: "Feedback", titleAr: "الملاحظات" }),
  stubLesson({ id: "audit-log", navHref: "/admin/audit-log", roles: A, focusTags: ["oversight"], titleEn: "Audit log", titleAr: "سجل التدقيق" }),
];
