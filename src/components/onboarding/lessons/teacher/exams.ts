import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./ExamsPractice"), { ssr: false });

export const examsLesson: LessonDef = {
  id: "exams",
  navHref: "/teacher/exams",
  roles: ["teacher"],
  focusTags: ["examsGrades"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Exams",
      oneLiner: "Schedule an exam or quiz so students and parents can plan ahead.",
      what: [
        "In New Exam/Quiz you choose one of your class and subject pairs, give the exam a title, pick Exam or Quiz, and set the date. The time and room are optional. Press Submit and it joins your list, shown with an Exam or Quiz label.",
        "This page only schedules. No marks are entered here: when the papers are marked, record the results on the Grades page.",
        "Students of the class are notified of a new exam or quiz, with its date and time.",
      ],
      useWhen: "you set a date for a test, so the class and families know about it.",
      visibility: {
        seenBy: ["Students of that class", "Their parents", "Admins"],
        notSeenBy: ["Other teachers (your list shows only your own exams)", "Parents of other classes"],
        note: "Students are notified of a new exam. Their parents are not notified, but they can see it in the app.",
      },
      tasks: [
        { id: "schedule", label: "Schedule an exam", hint: "Type a title, pick a date, then press Submit. Read the message that follows." },
        { id: "quiz", label: "Schedule a quiz", hint: "Choose Quiz in the Type field, add a title and a date, then press Submit. Look for the Quiz label in the list." },
      ],
      whereToFind: "Exams, in the sidebar.",
    },
    ar: {
      title: "الاختبارات",
      oneLiner: "حدّد موعد اختبار أو مذاكرة ليتمكن الطلاب وأولياء الأمور من الاستعداد.",
      what: [
        "في «اختبار/مذاكرة جديد» تختار أحد أزواج الفصل والمادة لديك، وتعطي الاختبار عنوانًا، وتختار «اختبار» أو «مذاكرة»، وتحدد التاريخ. الوقت والقاعة اختياريان. اضغط «إرسال» فينضم إلى قائمتك مع وسم «اختبار» أو «مذاكرة».",
        "هذه الصفحة للجدولة فقط. لا تُدخَل فيها درجات: وعندما تصحّح الأوراق سجّل النتائج في صفحة «الدرجات».",
        "يصل إلى طلاب الفصل إشعار بالاختبار أو المذاكرة الجديدة مع تاريخها ووقتها.",
      ],
      useWhen: "تحدد موعد اختبار ليعرف الفصل وأسر الطلاب به.",
      visibility: {
        seenBy: ["طلاب ذلك الفصل", "أولياء أمورهم", "الإدارة"],
        notSeenBy: ["المعلمون الآخرون (تعرض قائمتك اختباراتك أنت فقط)", "أولياء أمور الفصول الأخرى"],
        note: "يصل إلى الطلاب إشعار بالاختبار الجديد. أما أولياء الأمور فلا يصلهم إشعار، لكن يمكنهم رؤيته في التطبيق.",
      },
      tasks: [
        { id: "schedule", label: "حدّد موعد اختبار", hint: "اكتب عنوانًا واختر تاريخًا ثم اضغط «إرسال»، واقرأ الرسالة التي تظهر." },
        { id: "quiz", label: "حدّد موعد مذاكرة", hint: "اختر «مذاكرة» في حقل النوع، وأضف عنوانًا وتاريخًا، ثم اضغط «إرسال». ابحث عن وسم «مذاكرة» في القائمة." },
      ],
      whereToFind: "الاختبارات، في الشريط الجانبي.",
    },
  },
};
