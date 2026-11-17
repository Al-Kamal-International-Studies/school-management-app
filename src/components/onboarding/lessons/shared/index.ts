import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";
import { calendarText } from "./calendarText";
import { cambrilearnText } from "./cambrilearnText";
import { chatbotText } from "./chatbotText";
import { documentsText } from "./documentsText";
import { feedbackText } from "./feedbackText";
import { messagesText } from "./messagesText";
import { settingsText } from "./settingsText";

const MessagesPractice = dynamic(() => import("./MessagesPractice"), { ssr: false });
const CalendarPractice = dynamic(() => import("./CalendarPractice"), { ssr: false });
const DocumentsPractice = dynamic(() => import("./DocumentsPractice"), { ssr: false });
const CambriLearnPractice = dynamic(() => import("./CambriLearnPractice"), { ssr: false });
const ChatbotPractice = dynamic(() => import("./ChatbotPractice"), { ssr: false });
const FeedbackPractice = dynamic(() => import("./FeedbackPractice"), { ssr: false });
const SettingsPractice = dynamic(() => import("./SettingsPractice"), { ssr: false });

/**
 * Shared lessons: /messages (all roles), /calendar, /documents, /chatbot,
 * /feedback (teacher, student, parent), /cambrilearn (admin, teacher, student)
 * and /settings (all roles).
 */
export const sharedLessons: LessonDef[] = [
  { id: "messages", navHref: "/messages", roles: ["admin", "teacher", "student", "parent"], focusTags: ["messagingParents", "messages", "communication"], since: 10, text: messagesText, Practice: MessagesPractice },
  { id: "calendar", navHref: "/calendar", roles: ["teacher", "student", "parent"], focusTags: ["eventsDocuments"], since: 10, text: calendarText, Practice: CalendarPractice },
  { id: "documents", navHref: "/documents", roles: ["teacher", "student", "parent"], focusTags: ["eventsDocuments"], since: 10, text: documentsText, Practice: DocumentsPractice },
  { id: "chatbot", navHref: "/chatbot", roles: ["teacher", "student", "parent"], focusTags: [], since: 10, text: chatbotText(), Practice: ChatbotPractice },
  { id: "feedback", navHref: "/feedback", roles: ["teacher", "student", "parent"], focusTags: [], since: 10, text: feedbackText(), Practice: FeedbackPractice },
  { id: "cambrilearn", navHref: "/cambrilearn", roles: ["admin", "teacher", "student"], focusTags: [], since: 11, text: cambrilearnText, Practice: CambriLearnPractice },
  { id: "settings", navHref: "/settings", roles: ["admin", "teacher", "student", "parent"], focusTags: [], since: 10, text: settingsText, Practice: SettingsPractice },
];
