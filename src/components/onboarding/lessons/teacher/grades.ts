import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./GradesPractice"), { ssr: false });

export const gradesLesson: LessonDef = {
  id: "grades",
  navHref: "/teacher/grades",
  roles: ["teacher"],
  focusTags: ["examsGrades"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Grades",
      oneLiner: "Record a mark for a student on a test, quiz or any other assessment.",
      what: [
        "In Record Grade you pick a student and subject, name the assessment, and enter the marks obtained and the total marks. The term starts as Term 1; change it when needed.",
        "The app checks what you typed. It tells you if a field is empty, if the total is not above zero, or if the marks obtained are higher than the total. Fix it and press Submit again.",
        "Saved grades appear in the table below the form.",
      ],
      useWhen: "you have marked a test or quiz and want the result on record.",
      visibility: {
        seenBy: ["The student", "Their parents", "Admins"],
        notSeenBy: ["Other students", "Other parents", "Other teachers, even of the same class"],
        note: "Nobody is sent a notification when you record a grade. Students and parents see it the next time they open their Grades page.",
      },
      tasks: [
        { id: "record", label: "Record a grade", hint: "Name the assessment, enter marks obtained and total (for example 42 and 50), then press Submit." },
        { id: "exceed", label: "See the out-of-range message", hint: "Enter 60 marks obtained out of 50 total, press Submit and read the message." },
      ],
      whereToFind: "Grades, in the sidebar.",
    },
    ar: {
      title: "الدرجات",
      oneLiner: "سجّل درجة طالب في اختبار أو مذاكرة أو أي تقييم آخر.",
      what: [
        "في «تسجيل درجة» تختار الطالب والمادة، وتسمّي التقييم، وتدخل الدرجة المحصلة والدرجة الكلية. يبدأ الفصل الدراسي بقيمة «Term 1»، وتغيّره عند الحاجة.",
        "يتحقق التطبيق مما كتبته. فيخبرك إن كان هناك حقل فارغ، أو إن لم تكن الدرجة الكلية أكبر من صفر، أو إن زادت الدرجة المحصلة عن الكلية. صحّح الخطأ واضغط «إرسال» من جديد.",
        "تظهر الدرجات المحفوظة في الجدول أسفل النموذج.",
      ],
      useWhen: "تنتهي من تصحيح اختبار أو مذاكرة وتريد تسجيل النتيجة.",
      visibility: {
        seenBy: ["الطالب", "أولياء أمره", "الإدارة"],
        notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون", "المعلمون الآخرون، حتى في الفصل نفسه"],
        note: "لا يُرسَل إشعار لأحد عند تسجيل درجة. يراها الطالب وأولياء أمره عند فتح صفحة الدرجات.",
      },
      tasks: [
        { id: "record", label: "سجّل درجة", hint: "سمِّ التقييم، وأدخل الدرجة المحصلة والكلية (مثل 42 و50)، ثم اضغط «إرسال»." },
        { id: "exceed", label: "اطّلع على رسالة الدرجة الخارجة عن الحد", hint: "أدخل 60 كدرجة محصلة و50 كدرجة كلية، ثم اضغط «إرسال» واقرأ الرسالة." },
      ],
      whereToFind: "الدرجات، في الشريط الجانبي.",
    },
  },
};
