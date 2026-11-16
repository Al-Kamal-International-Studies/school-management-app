import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./AttendancePractice"), { ssr: false });

export const attendanceLesson: LessonDef = {
  id: "attendance",
  navHref: "/teacher/attendance",
  roles: ["teacher"],
  focusTags: ["attendance"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Attendance",
      oneLiner: "Mark who is present, absent, late or excused in your class, for any day up to today.",
      what: [
        "Choose a class and a date, then press Continue. You get one row per student with a status: Present, Absent, Late or Excused. Everyone starts as Present, so you only change the exceptions.",
        "Press Submit to save the whole sheet. There is one record per student per day, not one per lesson, so saving again for the same day replaces the earlier marks. A future date is refused.",
        "Under the sheet, Attendance History lists the marks you saved most recently.",
      ],
      useWhen: "you take the register for the day.",
      visibility: {
        seenBy: ["The student", "Their parents", "Admins", "Other teachers of the same class"],
        notSeenBy: ["Other students", "Other parents", "Teachers who don't teach the class"],
        note: "Nobody is sent a notification when you save attendance. Other teachers of the class can open the same sheet and change it.",
      },
      tasks: [
        { id: "continue", label: "Open a class sheet", hint: "Choose a class and a date, then press the Continue button." },
        { id: "mark", label: "Mark Omar absent and Lina late", hint: "On the sheet, set Omar Sample to Absent and Lina Sample to Late, then press Submit." },
        { id: "future-date", label: "Try a future date", hint: "Pick a date after today, press Continue, then press Submit and read the message." },
      ],
      whereToFind: "Attendance, in the sidebar. The classes and lessons listed on My Classes also open it.",
    },
    ar: {
      title: "الحضور",
      oneLiner: "سجّل من هو حاضر أو غائب أو متأخر أو معذور في فصلك، لأي يوم حتى اليوم.",
      what: [
        "اختر الفصل والتاريخ ثم اضغط «متابعة». ستظهر لك صفوف بعدد الطلاب، لكل طالب حالة: حاضر أو غائب أو متأخر أو معذور. يبدأ الجميع بحالة «حاضر»، فتغيّر الاستثناءات فقط.",
        "اضغط «إرسال» لحفظ الكشف كاملًا. هناك سجل واحد لكل طالب في اليوم، وليس لكل حصة، لذا فالحفظ مرة أخرى لليوم نفسه يستبدل العلامات السابقة. ولا يُقبل تاريخ في المستقبل.",
        "أسفل الكشف يعرض «سجل الحضور» آخر العلامات التي حفظتها.",
      ],
      useWhen: "تأخذ حضور اليوم.",
      visibility: {
        seenBy: ["الطالب", "أولياء أمره", "الإدارة", "معلمو الفصل الآخرون"],
        notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون", "المعلمون الذين لا يدرّسون هذا الفصل"],
        note: "لا يُرسَل أي إشعار لأحد عند حفظ الحضور. ويمكن لمعلمي الفصل الآخرين فتح الكشف نفسه وتعديله.",
      },
      tasks: [
        { id: "continue", label: "افتح كشف فصل", hint: "اختر الفصل والتاريخ ثم اضغط زر «متابعة»." },
        { id: "mark", label: "اجعل عمر غائبًا ولينا متأخرة", hint: "في الكشف، اجعل «عمر نموذج» غائبًا و«لينا نموذج» متأخرة، ثم اضغط «إرسال»." },
        { id: "future-date", label: "جرّب تاريخًا في المستقبل", hint: "اختر تاريخًا بعد اليوم، اضغط «متابعة»، ثم اضغط «إرسال» واقرأ الرسالة." },
      ],
      whereToFind: "الحضور، في الشريط الجانبي. وتفتحه أيضًا الفصول والحصص المعروضة في «فصولي».",
    },
  },
};
