import type { ChatbotPersona } from "@/lib/types/database.types";
import type { ChatRole } from "./faq";
import type { Locale } from "@/lib/i18n/locales";

export interface PersonaConfig {
  id: ChatbotPersona;
  name: string;
  role: string;
  avatarSrc: string;
  accent: "gold" | "navy";
}

export const PERSONAS: Record<ChatbotPersona, PersonaConfig> = {
  muhammad: {
    id: "muhammad",
    name: "Muhammad",
    role: "Help Assistant",
    avatarSrc: "/avatars/muhammad.png",
    accent: "navy",
  },
  sheikha: {
    id: "sheikha",
    name: "Sheikha",
    role: "Help Assistant",
    avatarSrc: "/avatars/sheikha.png",
    accent: "gold",
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);

/**
 * The opening message a persona sends when a conversation starts —
 * tailored to the asker's role so it reads naturally whether you're a
 * teacher, student, or parent, not just a generic "ask me anything" — and
 * to the caller's locale, so it reads as natural Arabic (not a literal
 * translation) when the app is in Arabic mode.
 */
export function getGreeting(personaId: ChatbotPersona, role: ChatRole, locale: Locale): string {
  const openings: Record<Locale, Record<ChatbotPersona, string>> = {
    en: {
      muhammad: "Marhaba! I'm Muhammad.",
      sheikha: "Hello! I'm Sheikha.",
    },
    ar: {
      muhammad: "مرحبًا! أنا محمد.",
      sheikha: "أهلًا! أنا شيخة.",
    },
  };

  const byRole: Record<Locale, Record<ChatRole, string>> = {
    en: {
      teacher: "Ask me anything about using the app — attendance, assignments, exams, grades, progress, or your account.",
      student: "Ask me anything about using the app — your timetable, attendance, assignments, exams, grades, or your account.",
      parent: "Ask me anything about the parent portal — your child's attendance, progress, grades, assignments, or your own account.",
    },
    ar: {
      teacher: "اسألني عن أي شيء يخص استخدام التطبيق — الحضور والغياب، الواجبات، الاختبارات، الدرجات، التقدم الدراسي، أو حسابك.",
      student: "اسألني عن أي شيء يخص استخدام التطبيق — جدولك الزمني، الحضور والغياب، الواجبات، الاختبارات، الدرجات، أو حسابك.",
      parent: "اسألني عن أي شيء يخص بوابة أولياء الأمور — حضور ابنك، تقدمه الدراسي، درجاته، واجباته، أو حسابك الخاص.",
    },
  };

  return `${openings[locale][personaId]} ${byRole[locale][role]}`;
}
