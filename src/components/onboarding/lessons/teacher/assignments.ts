import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./AssignmentsPractice"), { ssr: false });

export const assignmentsLesson: LessonDef = {
  id: "assignments",
  navHref: "/teacher/assignments",
  roles: ["teacher"],
  focusTags: ["homework"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Assignments",
      oneLiner: "Give homework to a class, then grade what students hand in.",
      what: [
        "In New Assignment you choose one of your class and subject pairs, write a title and an optional description, and set a due date. When you press Submit, the assignment appears in your list.",
        "Click an assignment's title to open it. You see every student in the class with a status: Pending (nothing yet), Submitted (the student marked it as handed in) or Graded.",
        "To grade, type a grade from 0 to 100 and some feedback on the student's row, then press Save. The status changes to Graded.",
      ],
      useWhen: "you set homework or need to mark what students handed in.",
      visibility: {
        seenBy: ["The students of that class", "Their parents", "Admins"],
        notSeenBy: ["Students of other classes", "Other parents", "Other teachers, even of the same class"],
        note: "Students are notified of a new assignment. Their parents are not, and nobody is notified when you grade.",
      },
      tasks: [
        { id: "create", label: "Create an assignment", hint: "Type a title and pick a due date in New Assignment, then press Submit." },
        { id: "open", label: "Open it from the list", hint: "Click the assignment's title in the table under the form." },
        { id: "grade", label: "Grade a student", hint: "On a student's row, type a grade and some feedback, then press Save. Try 150 first to see the message." },
      ],
      whereToFind: "Assignments, in the sidebar.",
    },
    ar: {
      title: "الواجبات",
      oneLiner: "أعطِ فصلًا واجبًا منزليًا، ثم قيّم ما يسلّمه الطلاب.",
      what: [
        "في «واجب جديد» تختار أحد أزواج الفصل والمادة لديك، وتكتب العنوان ووصفًا اختياريًا، وتحدد تاريخ التسليم. وعند الضغط على «إرسال» يظهر الواجب في قائمتك.",
        "اضغط على عنوان الواجب لفتحه. ستجد كل طلاب الفصل مع حالة لكل منهم: معلّق (لا شيء بعد)، أو تم التسليم (حدّده الطالب كمُسلَّم)، أو تم التقييم.",
        "للتقييم، اكتب درجة من 0 إلى 100 وبعض الملاحظات في صف الطالب، ثم اضغط «حفظ». تتغير الحالة إلى «تم التقييم».",
      ],
      useWhen: "تعطي واجبًا أو تريد تصحيح ما سلّمه الطلاب.",
      visibility: {
        seenBy: ["طلاب ذلك الفصل", "أولياء أمورهم", "الإدارة"],
        notSeenBy: ["طلاب الفصول الأخرى", "أولياء الأمور الآخرون", "المعلمون الآخرون، حتى في الفصل نفسه"],
        note: "يصل إلى الطلاب إشعار بالواجب الجديد. أما أولياء الأمور فلا يصلهم، ولا يُرسَل إشعار لأحد عند التقييم.",
      },
      tasks: [
        { id: "create", label: "أنشئ واجبًا", hint: "اكتب عنوانًا واختر تاريخ التسليم في «واجب جديد»، ثم اضغط «إرسال»." },
        { id: "open", label: "افتحه من القائمة", hint: "اضغط على عنوان الواجب في الجدول أسفل النموذج." },
        { id: "grade", label: "قيّم طالبًا", hint: "في صف أحد الطلاب اكتب درجة وبعض الملاحظات ثم اضغط «حفظ». جرّب 150 أولًا لترى الرسالة." },
      ],
      whereToFind: "الواجبات، في الشريط الجانبي.",
    },
  },
};
