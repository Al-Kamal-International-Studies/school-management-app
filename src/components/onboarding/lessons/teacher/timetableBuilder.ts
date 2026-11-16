import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./TimetableBuilderPractice"), { ssr: false });

export const timetableBuilderLesson: LessonDef = {
  id: "timetable-builder",
  navHref: "/teacher/timetable-builder",
  roles: ["teacher"],
  focusTags: ["timetable"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Timetable",
      oneLiner: "Build and change the weekly schedule of a class, period by period.",
      what: [
        "Choose a class, then use Add a period: pick a subject (its teacher is filled in for you), a day, a start and end time and, if you like, a room. The period appears in that day's card. Edit changes a period and Remove deletes it.",
        "Teachers can build and edit periods for classes in the school, and changes show to students and other teachers straight away. Work carefully: this is the real schedule people follow.",
        "The app refuses double-booking. A class can't have two periods that overlap, and a teacher can't be in two classes at the same time. The message tells you which period is in the way, so you can pick another time.",
      ],
      useWhen: "a class has no timetable yet or the school day changes.",
      visibility: {
        seenBy: ["Students of the class", "The teacher of each period", "Admins"],
        notSeenBy: ["Students of other classes", "Other parents"],
        note: "Edits are recorded in the admins' audit log with your name.",
      },
      tasks: [
        { id: "add-period", label: "Add a period", hint: "Choose a subject, a day, and start and end times (for example Tuesday 11:00 to 11:45), then press Add a period." },
        { id: "class-clash", label: "Try a class clash", hint: "In Practice Class 7A, add English on Monday from 09:30 to 10:15. Monday 09:00 to 09:45 is already taken for this class." },
        { id: "teacher-clash", label: "Try a teacher clash", hint: "In Practice Class 7A, add Mathematics on Monday from 10:00 to 10:30. Ms. Teacher One is already teaching Practice Class 8B then." },
        { id: "edit-period", label: "Edit a period", hint: "Press Edit under any period, change a time, then press Save changes." },
      ],
      whereToFind: "Timetable, in the sidebar. My timetable, just above it, is the read-only view of your own lessons.",
    },
    ar: {
      title: "الجدول الزمني",
      oneLiner: "أنشئ الجدول الأسبوعي لفصل وعدّله حصة بحصة.",
      what: [
        "اختر الفصل ثم استخدم «إضافة حصة»: اختر المادة (يُملأ اسم معلمها تلقائيًا)، واليوم، ووقتي البدء والانتهاء، والقاعة إن أردت. تظهر الحصة في بطاقة ذلك اليوم. «تعديل» يغيّر الحصة و«إزالة» تحذفها.",
        "يستطيع المعلمون إنشاء حصص الفصول في المدرسة وتعديلها، وتظهر التغييرات للطلاب والمعلمين الآخرين فورًا. اعمل بعناية: فهذا هو الجدول الحقيقي الذي يتبعه الجميع.",
        "يرفض التطبيق الحجز المزدوج. فلا يجوز أن يكون للفصل حصتان متداخلتان، ولا أن يكون المعلم في فصلين في الوقت نفسه. وتخبرك الرسالة أي حصة تعترض الطريق لتختار وقتًا آخر.",
      ],
      useWhen: "لا يكون لفصل جدول بعد أو يتغير اليوم الدراسي.",
      visibility: {
        seenBy: ["طلاب الفصل", "معلم كل حصة", "الإدارة"],
        notSeenBy: ["طلاب الفصول الأخرى", "أولياء الأمور الآخرون"],
        note: "تُسجَّل التعديلات باسمك في سجل التدقيق لدى الإدارة.",
      },
      tasks: [
        { id: "add-period", label: "أضف حصة", hint: "اختر المادة واليوم ووقتي البدء والانتهاء (مثل الثلاثاء من 11:00 إلى 11:45)، ثم اضغط «إضافة حصة»." },
        { id: "class-clash", label: "جرّب تعارض الفصل", hint: "في «صف التدريب 7أ» أضف «اللغة الإنجليزية» يوم الإثنين من 09:30 إلى 10:15. فالإثنين من 09:00 إلى 09:45 محجوز لهذا الفصل." },
        { id: "teacher-clash", label: "جرّب تعارض المعلم", hint: "في «صف التدريب 7أ» أضف «الرياضيات» يوم الإثنين من 10:00 إلى 10:30. فالأستاذة «معلمة أولى» تدرّس «صف التدريب 8ب» في ذلك الوقت." },
        { id: "edit-period", label: "عدّل حصة", hint: "اضغط «تعديل» تحت أي حصة، غيّر وقتًا، ثم اضغط «حفظ التغييرات»." },
      ],
      whereToFind: "الجدول الزمني، في الشريط الجانبي. أما «جدولي» فهو العرض للقراءة فقط لحصصك أنت.",
    },
  },
};
