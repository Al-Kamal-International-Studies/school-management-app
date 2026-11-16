import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";
import {
  parentDashboardText,
  parentIdCardText,
  studentAssignmentsText,
  studentAttendanceText,
  studentDashboardText,
  studentExamsText,
  studentGradesText,
  studentIdCardText,
  studentLeaveText,
  studentTimetableText,
} from "./texts";

/**
 * Student and parent lessons: every /student/* href, /parent and /parent/id-card.
 * Each practice screen is lazy-loaded so a lesson costs nothing until it is opened.
 */
const S: LessonDef["roles"] = ["student"];
const P: LessonDef["roles"] = ["parent"];

const StudentDashboardPractice = dynamic(() => import("./StudentDashboardPractice"), { ssr: false });
const StudentIdCardPractice = dynamic(() => import("./StudentIdCardPractice"), { ssr: false });
const StudentTimetablePractice = dynamic(() => import("./StudentTimetablePractice"), { ssr: false });
const StudentAttendancePractice = dynamic(() => import("./StudentAttendancePractice"), { ssr: false });
const StudentAssignmentsPractice = dynamic(() => import("./StudentAssignmentsPractice"), { ssr: false });
const StudentExamsPractice = dynamic(() => import("./StudentExamsPractice"), { ssr: false });
const StudentGradesPractice = dynamic(() => import("./StudentGradesPractice"), { ssr: false });
const StudentLeavePractice = dynamic(() => import("./StudentLeavePractice"), { ssr: false });
const ParentDashboardPractice = dynamic(() => import("./ParentDashboardPractice"), { ssr: false });
const ParentIdCardPractice = dynamic(() => import("./ParentIdCardPractice"), { ssr: false });

export const studentParentLessons: LessonDef[] = [
  { id: "dashboard", navHref: "/student", roles: S, focusTags: [], since: 10, text: studentDashboardText, Practice: StudentDashboardPractice },
  { id: "id-card", navHref: "/student/id-card", roles: S, focusTags: [], since: 10, text: studentIdCardText, Practice: StudentIdCardPractice },
  { id: "timetable", navHref: "/student/timetable", roles: S, focusTags: ["timetable"], since: 10, text: studentTimetableText, Practice: StudentTimetablePractice },
  { id: "attendance", navHref: "/student/attendance", roles: S, focusTags: [], since: 10, text: studentAttendanceText, Practice: StudentAttendancePractice },
  { id: "assignments", navHref: "/student/assignments", roles: S, focusTags: ["homework"], since: 10, text: studentAssignmentsText, Practice: StudentAssignmentsPractice },
  { id: "exams", navHref: "/student/exams", roles: S, focusTags: ["grades"], since: 10, text: studentExamsText, Practice: StudentExamsPractice },
  { id: "grades", navHref: "/student/grades", roles: S, focusTags: ["grades"], since: 10, text: studentGradesText, Practice: StudentGradesPractice },
  { id: "leave", navHref: "/student/leave", roles: S, focusTags: [], since: 10, text: studentLeaveText, Practice: StudentLeavePractice },
  { id: "dashboard", navHref: "/parent", roles: P, focusTags: ["grades", "attendance"], since: 10, text: parentDashboardText, Practice: ParentDashboardPractice },
  { id: "id-card", navHref: "/parent/id-card", roles: P, focusTags: [], since: 10, text: parentIdCardText, Practice: ParentIdCardPractice },
];
