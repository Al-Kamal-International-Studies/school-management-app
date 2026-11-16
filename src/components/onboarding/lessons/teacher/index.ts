import type { LessonDef } from "@/lib/onboarding/types";
import { stubLesson } from "../stub";

/**
 * Teacher lessons: every /teacher/* sidebar href.
 * Replace each stub with a real LessonDef; keep the id and navHref.
 */
const T: LessonDef["roles"] = ["teacher"];

export const teacherLessons: LessonDef[] = [
  stubLesson({ id: "my-classes", navHref: "/teacher", roles: T, titleEn: "My classes", titleAr: "صفوفي" }),
  stubLesson({ id: "id-cards", navHref: "/teacher/id-cards", roles: T, titleEn: "ID cards", titleAr: "بطاقات الهوية" }),
  stubLesson({ id: "my-timetable", navHref: "/teacher/timetable", roles: T, focusTags: ["timetable"], titleEn: "My timetable", titleAr: "جدولي" }),
  stubLesson({ id: "timetable-builder", navHref: "/teacher/timetable-builder", roles: T, focusTags: ["timetable"], titleEn: "Timetable", titleAr: "الجدول الدراسي" }),
  stubLesson({ id: "attendance", navHref: "/teacher/attendance", roles: T, focusTags: ["attendance"], titleEn: "Attendance", titleAr: "الحضور" }),
  stubLesson({ id: "assignments", navHref: "/teacher/assignments", roles: T, focusTags: ["homework"], titleEn: "Assignments", titleAr: "المهام" }),
  stubLesson({ id: "exams", navHref: "/teacher/exams", roles: T, focusTags: ["examsGrades"], titleEn: "Exams", titleAr: "الاختبارات" }),
  stubLesson({ id: "grades", navHref: "/teacher/grades", roles: T, focusTags: ["examsGrades"], titleEn: "Grades", titleAr: "الدرجات" }),
  stubLesson({ id: "remarks", navHref: "/teacher/remarks", roles: T, focusTags: ["remarksProgress"], titleEn: "Remarks and behaviour", titleAr: "الملاحظات والسلوك" }),
  stubLesson({ id: "progress", navHref: "/teacher/progress", roles: T, focusTags: ["remarksProgress"], titleEn: "Progress", titleAr: "التقدم" }),
];
