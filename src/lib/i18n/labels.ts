import type { Dictionary } from "./types";

/**
 * User-facing labels for database enum values. Badges used to print the raw
 * stored value ("present", "quiz", "positive", "student", "teacher"…), which
 * stayed English in the Arabic UI (audit finding I18N-2, HANDOVER Part 33).
 * Every helper falls back to the raw value for an unknown input, so a future
 * enum value shows up untranslated instead of breaking the page.
 */
export function roleLabel(dict: Dictionary, role: string): string {
  const map: Record<string, string> = {
    admin: dict.common.roleAdmin,
    teacher: dict.common.roleTeacher,
    student: dict.common.roleStudent,
    parent: dict.common.roleParent,
  };
  return map[role] ?? role;
}

/**
 * What to show as someone's job title / role badge: an admin's free-text `title`
 * ("Principal", "Director", "Administrator") translated when we know it, else
 * as typed; with no title, the translated role name.
 */
export function displayTitle(dict: Dictionary, profile: { title: string | null; role: string }): string {
  const title = profile.title?.trim();
  if (!title) return roleLabel(dict, profile.role);
  const known: Record<string, string> = {
    director: dict.common.titleDirector,
    principal: dict.common.titlePrincipal,
    administrator: dict.common.titleAdministrator,
  };
  return known[title.toLowerCase()] ?? title;
}

export function attendanceLabel(dict: Dictionary, status: string): string {
  const map: Record<string, string> = {
    present: dict.attendance.present,
    absent: dict.attendance.absent,
    late: dict.attendance.late,
    excused: dict.attendance.excused,
  };
  return map[status] ?? status;
}

export function behaviourLabel(dict: Dictionary, category: string): string {
  const map: Record<string, string> = { positive: dict.behaviour.positive, negative: dict.behaviour.negative };
  return map[category] ?? category;
}

export function examTypeLabel(dict: Dictionary, type: string): string {
  const map: Record<string, string> = { exam: dict.exams.exam, quiz: dict.exams.quiz };
  return map[type] ?? type;
}

export function documentCategoryLabel(dict: Dictionary, category: string): string {
  const map: Record<string, string> = {
    admit_card: dict.documents.admitCard,
    report_card: dict.documents.reportCard,
    certificate: dict.documents.certificate,
    policy: dict.documents.policy,
    general: dict.documents.general,
  };
  return map[category] ?? category;
}

export function feedbackCategoryLabel(dict: Dictionary, category: string): string {
  const map: Record<string, string> = {
    technical: dict.feedback.categoryTechnical,
    academic: dict.feedback.categoryAcademic,
    suggestion: dict.feedback.categorySuggestion,
    general: dict.feedback.categoryGeneral,
  };
  return map[category] ?? category;
}

export function audienceLabel(dict: Dictionary, audience: string): string {
  const map: Record<string, string> = {
    all: dict.announcements.audienceAll,
    teacher: dict.announcements.audienceTeacher,
    student: dict.announcements.audienceStudent,
    parent: dict.announcements.audienceParent,
  };
  return map[audience] ?? audience;
}
