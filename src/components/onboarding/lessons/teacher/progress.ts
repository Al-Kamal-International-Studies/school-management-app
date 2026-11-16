import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./ProgressPractice"), { ssr: false });

export const progressLesson: LessonDef = {
  id: "progress",
  navHref: "/teacher/progress",
  roles: ["teacher"],
  focusTags: ["remarksProgress"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Progress",
      oneLiner: "File a monthly progress report for a student in one of your subjects.",
      what: [
        "In New Entry you pick a student and subject, choose the month, and give six scores from 0 to 100: attendance, homework completion, class participation, behaviour and conduct, assessment performance and subject understanding. You can add comments and priority areas for improvement.",
        "The overall score is the average of the six. It feeds the student's progress ring. Past Entries lists what you have filed.",
        "There is one entry per student, subject and month. Submitting the same combination again replaces the earlier entry, which is how you correct a mistake. A future month is refused.",
      ],
      useWhen: "you write the monthly report for a student.",
      visibility: {
        seenBy: ["The student", "Their parents", "Admins", "You (the author)"],
        notSeenBy: ["Other teachers", "Other students", "Other parents"],
        note: "Your comments and scores are visible to the student and their parents, so word them with care. Nobody is sent a notification when you submit.",
      },
      tasks: [
        { id: "submit", label: "File an entry", hint: "Keep the sample scores or change them, then press Submit. Your entry appears under Past Entries." },
        { id: "refile", label: "Correct it by filing again", hint: "Change a score and press Submit again for the same student, subject and month. The row is replaced, not added." },
        { id: "future-month", label: "Try a future month", hint: "Set Month to next month and press Submit. Read the message." },
      ],
      whereToFind: "Progress, in the sidebar. The Submit Progress button on My Classes opens it too.",
    },
    ar: {
      title: "التقدم",
      oneLiner: "قدّم تقرير تقدم شهريًا لطالب في إحدى موادك.",
      what: [
        "في «سجل جديد» تختار الطالب والمادة والشهر، وتعطي ست درجات من 0 إلى 100: الحضور، وإنجاز الواجبات، والمشاركة الصفية، والسلوك والانضباط، وأداء التقييمات، وفهم المادة. ويمكنك إضافة ملاحظات ومجالات الأولوية للتحسين.",
        "الدرجة الإجمالية هي متوسط الدرجات الست، وهي التي تغذّي دائرة التقدم لدى الطالب. وتعرض «السجلات السابقة» ما قدّمته.",
        "هناك سجل واحد لكل طالب ومادة وشهر. وإرسال المجموعة نفسها مرة أخرى يستبدل السجل السابق، وبهذا تصحّح الخطأ. ولا يُقبل شهر في المستقبل.",
      ],
      useWhen: "تكتب التقرير الشهري لطالب.",
      visibility: {
        seenBy: ["الطالب", "أولياء أمره", "الإدارة", "أنت (كاتب التقرير)"],
        notSeenBy: ["المعلمون الآخرون", "الطلاب الآخرون", "أولياء الأمور الآخرون"],
        note: "درجاتك وملاحظاتك يراها الطالب وأولياء أمره، فاختر كلماتك بعناية. ولا يُرسَل إشعار لأحد عند الإرسال.",
      },
      tasks: [
        { id: "submit", label: "قدّم سجلًا", hint: "أبقِ الدرجات التجريبية أو غيّرها، ثم اضغط «إرسال». يظهر سجلك تحت «السجلات السابقة»." },
        { id: "refile", label: "صحّحه بتقديمه مرة أخرى", hint: "غيّر درجة واضغط «إرسال» مجددًا لنفس الطالب والمادة والشهر. يُستبدل الصف ولا يُضاف صف جديد." },
        { id: "future-month", label: "جرّب شهرًا في المستقبل", hint: "اجعل الشهر هو الشهر القادم واضغط «إرسال»، ثم اقرأ الرسالة." },
      ],
      whereToFind: "التقدم، في الشريط الجانبي. ويفتحه أيضًا زر «إرسال التقدم» في «فصولي».",
    },
  },
};
