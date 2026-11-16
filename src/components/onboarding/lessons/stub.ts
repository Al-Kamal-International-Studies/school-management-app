import dynamic from "next/dynamic";
import type { UserRole } from "@/lib/types/database.types";
import type { FocusTag, LessonDef, LessonText } from "@/lib/onboarding/types";

const StubPractice = dynamic(() => import("./StubPractice"), { ssr: false });

/**
 * Builds a placeholder lesson so the whole flow works end to end before the
 * real lessons exist. Lesson authors REPLACE a stub with a real LessonDef;
 * they do not edit this helper. Delete this file once no stub remains.
 */
export function stubLesson(opts: {
  id: string;
  navHref: string;
  roles: UserRole[];
  focusTags?: FocusTag[];
  titleEn: string;
  titleAr: string;
  requiresOverseer?: boolean;
}): LessonDef {
  const make = (title: string, ar: boolean): LessonText => ({
    title,
    oneLiner: ar ? `درس مؤقت: ${title}.` : `Placeholder lesson for ${title}.`,
    what: [ar ? "نص هذا الدرس قيد الكتابة." : "The text for this lesson is still being written."],
    useWhen: ar ? "يكتمل هذا الدرس." : "this lesson is finished.",
    visibility: {
      seenBy: [ar ? "قيد الكتابة" : "To be written"],
      notSeenBy: [ar ? "قيد الكتابة" : "To be written"],
    },
    tasks: [
      {
        id: "done",
        label: ar ? "اضغط «تم»" : "Press Done",
        hint: ar ? "اضغط زر «تم» في منطقة التدريب." : "Press the Done button in the practice area.",
      },
    ],
    whereToFind: ar ? `${title}، في الشريط الجانبي.` : `${title}, in the sidebar.`,
  });
  return {
    id: opts.id,
    navHref: opts.navHref,
    roles: opts.roles,
    focusTags: opts.focusTags ?? [],
    since: 10,
    text: { en: make(opts.titleEn, false), ar: make(opts.titleAr, true) },
    Practice: StubPractice,
    requiresOverseer: opts.requiresOverseer,
  };
}
