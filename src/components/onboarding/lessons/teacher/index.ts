import type { LessonDef } from "@/lib/onboarding/types";
import { assignmentsLesson } from "./assignments";
import { attendanceLesson } from "./attendance";
import { examsLesson } from "./exams";
import { gradesLesson } from "./grades";
import { idCardsLesson } from "./idCards";
import { myClassesLesson } from "./myClasses";
import { myTimetableLesson } from "./myTimetable";
import { progressLesson } from "./progress";
import { remarksLesson } from "./remarks";
import { timetableBuilderLesson } from "./timetableBuilder";

/** Teacher lessons: every /teacher/* sidebar href, in sidebar order. */
export const teacherLessons: LessonDef[] = [
  myClassesLesson,
  idCardsLesson,
  myTimetableLesson,
  timetableBuilderLesson,
  attendanceLesson,
  assignmentsLesson,
  examsLesson,
  gradesLesson,
  remarksLesson,
  progressLesson,
];
