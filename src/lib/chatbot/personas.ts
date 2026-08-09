import type { ChatbotPersona } from "@/lib/types/database.types";
import type { ChatRole } from "./faq";

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
 * teacher, student, or parent, not just a generic "ask me anything".
 */
export function getGreeting(personaId: ChatbotPersona, role: ChatRole): string {
  const openings: Record<ChatbotPersona, string> = {
    muhammad: "Marhaba! I'm Muhammad.",
    sheikha: "Hello! I'm Sheikha.",
  };

  const byRole: Record<ChatRole, string> = {
    teacher: "Ask me anything about using the app — attendance, assignments, exams, grades, progress, or your account.",
    student: "Ask me anything about using the app — your timetable, attendance, assignments, exams, grades, or your account.",
    parent: "Ask me anything about the parent portal — your child's attendance, progress, grades, assignments, or your own account.",
  };

  return `${openings[personaId]} ${byRole[role]}`;
}
