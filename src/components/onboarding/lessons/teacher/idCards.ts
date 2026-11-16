import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./IdCardsPractice"), { ssr: false });

export const idCardsLesson: LessonDef = {
  id: "id-cards",
  navHref: "/teacher/id-cards",
  roles: ["teacher"],
  focusTags: [],
  since: 10,
  Practice,
  text: {
    en: {
      title: "ID cards",
      oneLiner: "View or download the ID card of any student in your classes.",
      what: [
        "The list shows the students of your classes with their class and student ID. Click View ID card to open a student's card.",
        "On the card you can download it as a PDF or save it as an image. This is handy when a student has lost their card or a school trip needs one.",
        "You can look but not change: teachers cannot change a student's photo.",
      ],
      useWhen: "you need to check a student's ID details or print a copy of their card.",
      visibility: {
        seenBy: ["Teachers of that student's class", "Admins", "The student and their parents (their own card)"],
        notSeenBy: ["Teachers who don't teach the student", "Other students", "Other parents"],
        note: "If you open a card for a student who is not in one of your classes, the app shows a not-found page.",
      },
      tasks: [
        { id: "open-card", label: "Open a student's card", hint: "Press View ID card on any row of the list." },
        { id: "download", label: "Download the card", hint: "On the card, press Download PDF or Save as Image. Notice there is no button to change the photo." },
      ],
      whereToFind: "ID Cards, in the sidebar.",
    },
    ar: {
      title: "بطاقات الهوية",
      oneLiner: "اعرض أو نزّل بطاقة هوية أي طالب في فصولك.",
      what: [
        "تعرض القائمة طلاب فصولك مع الفصل ورقم الطالب. اضغط «عرض بطاقة الهوية» لفتح بطاقة طالب.",
        "في البطاقة يمكنك تنزيلها بصيغة PDF أو حفظها كصورة. وهذا مفيد حين يفقد الطالب بطاقته أو تحتاج رحلة مدرسية إلى نسخة منها.",
        "يمكنك الاطلاع دون التغيير: فالمعلمون لا يستطيعون تغيير صورة الطالب.",
      ],
      useWhen: "تحتاج إلى التحقق من بيانات هوية طالب أو طباعة نسخة من بطاقته.",
      visibility: {
        seenBy: ["معلمو فصل ذلك الطالب", "الإدارة", "الطالب وأولياء أمره (بطاقته هو)"],
        notSeenBy: ["المعلمون الذين لا يدرّسون الطالب", "الطلاب الآخرون", "أولياء الأمور الآخرون"],
        note: "إذا فتحت بطاقة طالب ليس في أحد فصولك فستظهر لك صفحة «غير موجود».",
      },
      tasks: [
        { id: "open-card", label: "افتح بطاقة طالب", hint: "اضغط «عرض بطاقة الهوية» في أي صف من القائمة." },
        { id: "download", label: "نزّل البطاقة", hint: "في البطاقة اضغط «تنزيل PDF» أو «حفظ كصورة». لاحظ أنه لا يوجد زر لتغيير الصورة." },
      ],
      whereToFind: "بطاقات الهوية، في الشريط الجانبي.",
    },
  },
};
