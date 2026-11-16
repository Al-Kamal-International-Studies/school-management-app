import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./MyClassesPractice"), { ssr: false });

export const myClassesLesson: LessonDef = {
  id: "my-classes",
  navHref: "/teacher",
  roles: ["teacher"],
  focusTags: [],
  since: 10,
  Practice,
  text: {
    en: {
      title: "My classes",
      oneLiner: "Your home page: today's lessons, the latest announcements and the classes you teach.",
      what: [
        "At the top are four numbers: your classes, your students, your upcoming exams, and Pending grading, which counts what students handed in that you have not graded yet. A button takes you straight to Progress.",
        "Today's schedule lists your lessons for the day with time, subject, class and room. Below it, My Classes lists each class and subject you teach with its student count.",
        "Every lesson and every class row is a shortcut: it opens Attendance for that class, so you can take the register in one click.",
      ],
      useWhen: "you start your day and want to see what is next.",
      visibility: {
        seenBy: ["You"],
        notSeenBy: ["Other teachers", "Students", "Parents"],
        note: "The classes and lessons come from what your admin set up. If the list is empty, ask the admin to assign you to a class.",
      },
      tasks: [
        { id: "todays-lesson", label: "Open a lesson from today's schedule", hint: "Click one of the lessons under Today's schedule." },
        { id: "class-row", label: "Open a class from My Classes", hint: "Click a class name in the My Classes table." },
      ],
      whereToFind: "My Classes, the first item in the sidebar.",
    },
    ar: {
      title: "فصولي",
      oneLiner: "صفحتك الرئيسية: حصص اليوم وآخر الإعلانات والفصول التي تدرّسها.",
      what: [
        "في الأعلى أربعة أرقام: فصولك، وطلابك، واختباراتك القادمة، و«بانتظار التصحيح» الذي يحصي ما سلّمه الطلاب ولم تقيّمه بعد. وهناك زر يوصلك مباشرة إلى «التقدم».",
        "يعرض «جدول اليوم» حصصك لهذا اليوم مع الوقت والمادة والفصل والقاعة. وتحته يعرض «فصولي» كل فصل ومادة تدرّسها مع عدد طلابه.",
        "كل حصة وكل صف فصل هو اختصار: يفتح «الحضور» لذلك الفصل، فتأخذ الحضور بضغطة واحدة.",
      ],
      useWhen: "تبدأ يومك وتريد أن تعرف ما التالي.",
      visibility: {
        seenBy: ["أنت"],
        notSeenBy: ["المعلمون الآخرون", "الطلاب", "أولياء الأمور"],
        note: "الفصول والحصص تأتي مما أعدّته الإدارة. وإن كانت القائمة فارغة فاطلب من الإدارة تعيينك في فصل.",
      },
      tasks: [
        { id: "todays-lesson", label: "افتح حصة من جدول اليوم", hint: "اضغط على إحدى الحصص تحت «جدول اليوم»." },
        { id: "class-row", label: "افتح فصلًا من «فصولي»", hint: "اضغط على اسم فصل في جدول «فصولي»." },
      ],
      whereToFind: "فصولي، أول عنصر في الشريط الجانبي.",
    },
  },
};
