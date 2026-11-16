import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./MyTimetablePractice"), { ssr: false });

export const myTimetableLesson: LessonDef = {
  id: "my-timetable",
  navHref: "/teacher/timetable",
  roles: ["teacher"],
  focusTags: ["timetable"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "My timetable",
      oneLiner: "See every lesson you teach across the week, in every class.",
      what: [
        "The page shows one card per weekday. Each lesson lists its time, subject, class and room, in time order.",
        "It is read-only. To add, move or remove periods, use the Timetable page.",
        "If you see 'Nothing scheduled yet', your admin has not built your timetable yet.",
      ],
      useWhen: "you want to check where you need to be tomorrow or later this week.",
      visibility: {
        seenBy: ["You"],
        notSeenBy: ["Parents"],
        note: "Students see the timetable of their own class on their own page.",
      },
      tasks: [
        { id: "find-room", label: "Find Tuesday's first room", hint: "Look at the Tuesday card, then choose the room of the earliest lesson in the first question." },
        { id: "find-class", label: "Find Monday's 10:00 class", hint: "Look at the Monday card, then choose the class taught at 10:00 in the second question." },
      ],
      whereToFind: "My Timetable, in the sidebar.",
    },
    ar: {
      title: "جدولي",
      oneLiner: "اطّلع على كل حصة تدرّسها على مدار الأسبوع، في كل الفصول.",
      what: [
        "تعرض الصفحة بطاقة لكل يوم دراسي. وتذكر كل حصة وقتها ومادتها وفصلها وقاعتها، مرتبة حسب الوقت.",
        "الصفحة للقراءة فقط. ولإضافة حصص أو نقلها أو إزالتها استخدم صفحة «الجدول الزمني».",
        "إذا ظهرت لك عبارة «لا يوجد شيء مجدول بعد» فمعنى ذلك أن الإدارة لم تُنشئ جدولك بعد.",
      ],
      useWhen: "تريد أن تعرف أين ستكون غدًا أو لاحقًا هذا الأسبوع.",
      visibility: {
        seenBy: ["أنت"],
        notSeenBy: ["أولياء الأمور"],
        note: "يرى الطلاب جدول فصلهم في صفحتهم الخاصة.",
      },
      tasks: [
        { id: "find-room", label: "اعرف قاعة أول حصة يوم الثلاثاء", hint: "انظر إلى بطاقة الثلاثاء، ثم اختر في السؤال الأول قاعة أبكر حصة." },
        { id: "find-class", label: "اعرف فصل الإثنين الساعة 10:00", hint: "انظر إلى بطاقة الإثنين، ثم اختر في السؤال الثاني الفصل الذي يُدرَّس الساعة 10:00." },
      ],
      whereToFind: "جدولي، في الشريط الجانبي.",
    },
  },
};
