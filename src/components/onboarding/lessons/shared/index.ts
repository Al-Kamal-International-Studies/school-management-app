import type { LessonDef } from "@/lib/onboarding/types";
import { stubLesson } from "../stub";

/**
 * Shared lessons: /messages (all roles), /calendar, /documents, /chatbot,
 * /feedback (teacher, student, parent) and /settings (all roles).
 * Replace each stub with a real LessonDef; keep the id and navHref.
 */
export const sharedLessons: LessonDef[] = [
  stubLesson({ id: "messages", navHref: "/messages", roles: ["admin", "teacher", "student", "parent"], focusTags: ["messagingParents", "messages", "communication"], titleEn: "Messages", titleAr: "الرسائل" }),
  stubLesson({ id: "calendar", navHref: "/calendar", roles: ["teacher", "student", "parent"], focusTags: ["eventsDocuments"], titleEn: "Calendar", titleAr: "التقويم" }),
  stubLesson({ id: "documents", navHref: "/documents", roles: ["teacher", "student", "parent"], focusTags: ["eventsDocuments"], titleEn: "Documents", titleAr: "المستندات" }),
  stubLesson({ id: "chatbot", navHref: "/chatbot", roles: ["teacher", "student", "parent"], titleEn: "Help assistant", titleAr: "المساعد" }),
  stubLesson({ id: "feedback", navHref: "/feedback", roles: ["teacher", "student", "parent"], titleEn: "Feedback", titleAr: "الملاحظات" }),
  stubLesson({ id: "settings", navHref: "/settings", roles: ["admin", "teacher", "student", "parent"], titleEn: "Settings", titleAr: "الإعدادات" }),
];
