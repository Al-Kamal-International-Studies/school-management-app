import type { OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";

/** A string in both languages. */
export interface L {
  en: string;
  ar: string;
}

export const pick = (x: L | string, locale: OnboardingLocale): string => (typeof x === "string" ? x : x[locale]);

/** Same words as the real app's `common.roleAdmin` etc. */
export const ROLE_LABEL: Record<UserRole, L> = {
  admin: { en: "Admin", ar: "مدير" },
  teacher: { en: "Teacher", ar: "معلم" },
  student: { en: "Student", ar: "طالب" },
  parent: { en: "Parent", ar: "ولي أمر" },
};

/** One more fictional person, so admins have someone to chat with. */
export const FAKE_ADMIN: { id: string; en: string; ar: string } = {
  id: "a1",
  en: "Ms. Admin Sample",
  ar: "الأستاذة الإدارية نموذج",
};
