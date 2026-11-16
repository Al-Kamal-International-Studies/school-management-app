import type { LessonDef } from "@/lib/onboarding/types";
import { stubLesson } from "../stub";

/**
 * Student and parent lessons: every /student/* href, /parent and /parent/id-card.
 * Replace each stub with a real LessonDef; keep the id and navHref.
 */
const S: LessonDef["roles"] = ["student"];
const P: LessonDef["roles"] = ["parent"];

export const studentParentLessons: LessonDef[] = [
  stubLesson({ id: "dashboard", navHref: "/student", roles: S, titleEn: "Dashboard", titleAr: "لوحتي" }),
  stubLesson({ id: "id-card", navHref: "/student/id-card", roles: S, titleEn: "ID card", titleAr: "بطاقة الهوية" }),
  stubLesson({ id: "timetable", navHref: "/student/timetable", roles: S, focusTags: ["timetable"], titleEn: "My timetable", titleAr: "جدولي" }),
  stubLesson({ id: "attendance", navHref: "/student/attendance", roles: S, titleEn: "Attendance", titleAr: "الحضور" }),
  stubLesson({ id: "assignments", navHref: "/student/assignments", roles: S, focusTags: ["homework"], titleEn: "Assignments", titleAr: "المهام" }),
  stubLesson({ id: "exams", navHref: "/student/exams", roles: S, focusTags: ["grades"], titleEn: "Exams", titleAr: "الاختبارات" }),
  stubLesson({ id: "grades", navHref: "/student/grades", roles: S, focusTags: ["grades"], titleEn: "Grades", titleAr: "الدرجات" }),
  stubLesson({ id: "leave", navHref: "/student/leave", roles: S, titleEn: "Leave requests", titleAr: "طلبات الإجازة" }),
  stubLesson({ id: "dashboard", navHref: "/parent", roles: P, focusTags: ["grades", "attendance"], titleEn: "Dashboard", titleAr: "لوحتي" }),
  stubLesson({ id: "id-card", navHref: "/parent/id-card", roles: P, titleEn: "ID card", titleAr: "بطاقة الهوية" }),
];
