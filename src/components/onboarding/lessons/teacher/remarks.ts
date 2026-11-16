import dynamic from "next/dynamic";
import type { LessonDef } from "@/lib/onboarding/types";

const Practice = dynamic(() => import("./RemarksPractice"), { ssr: false });

export const remarksLesson: LessonDef = {
  id: "remarks",
  navHref: "/teacher/remarks",
  roles: ["teacher"],
  focusTags: ["remarksProgress"],
  since: 10,
  Practice,
  text: {
    en: {
      title: "Remarks and behaviour",
      oneLiner: "Write short notes about a student and keep a positive or negative behaviour log.",
      what: [
        "There are two forms side by side. New Remark is a short written note about a student. New Entry is a behaviour log item: you choose Positive or Negative and describe what happened. Press Submit on either one.",
        "Below the forms you see your own remarks and behaviour entries, with a green or red label for Positive or Negative.",
        "Everything you write here is shared with the student and their parents. That includes Negative entries. Write it as if the family will read it, because they will.",
      ],
      useWhen: "you want to praise a student, record a concern, or leave a note the family should see.",
      visibility: {
        seenBy: ["The student", "Their parents", "Admins", "You (the author)"],
        notSeenBy: ["Other teachers", "Other students", "Other parents"],
        note: "Negative entries are visible to the student and their parents too. Nobody is sent a notification when you save a remark or entry; they see it on their dashboard.",
      },
      tasks: [
        { id: "remark", label: "Add a remark", hint: "Pick a student, write a short note in New Remark, then press its Submit button." },
        { id: "behaviour", label: "Log a behaviour entry", hint: "In New Entry choose a student, set the category (try Negative), describe it, then press its Submit button and read who can see it." },
      ],
      whereToFind: "Remarks & Behaviour, in the sidebar.",
    },
    ar: {
      title: "الملاحظات والسلوك",
      oneLiner: "اكتب ملاحظات قصيرة عن طالب، وأبقِ سجلًا للسلوك الإيجابي والسلبي.",
      what: [
        "هناك نموذجان جنبًا إلى جنب. «ملاحظة جديدة» هي ملاحظة مكتوبة قصيرة عن طالب. و«سجل جديد» هو بند في سجل السلوك: تختار إيجابي أو سلبي وتصف ما حدث. اضغط «إرسال» في أيٍّ منهما.",
        "تحت النموذجين ترى ملاحظاتك وسجلات السلوك التي كتبتها، مع وسم أخضر أو أحمر للإيجابي والسلبي.",
        "كل ما تكتبه هنا يُشارَك مع الطالب وأولياء أمره، بما في ذلك السجلات السلبية. اكتبه كما لو أن الأسرة ستقرؤه، لأنها ستقرؤه فعلًا.",
      ],
      useWhen: "تريد أن تشيد بطالب، أو تسجّل أمرًا مقلقًا، أو تترك ملاحظة ينبغي أن تراها الأسرة.",
      visibility: {
        seenBy: ["الطالب", "أولياء أمره", "الإدارة", "أنت (كاتب الملاحظة)"],
        notSeenBy: ["المعلمون الآخرون", "الطلاب الآخرون", "أولياء الأمور الآخرون"],
        note: "السجلات السلبية يراها الطالب وأولياء أمره أيضًا. ولا يُرسَل إشعار لأحد عند حفظ ملاحظة أو سجل؛ يرونها في لوحتهم.",
      },
      tasks: [
        { id: "remark", label: "أضف ملاحظة", hint: "اختر طالبًا، واكتب ملاحظة قصيرة في «ملاحظة جديدة»، ثم اضغط زر «إرسال» الخاص بها." },
        { id: "behaviour", label: "سجّل بند سلوك", hint: "في «سجل جديد» اختر طالبًا، وحدد الفئة (جرّب «سلبي»)، واكتب الوصف، ثم اضغط زر «إرسال» الخاص به واقرأ من يستطيع رؤيته." },
      ],
      whereToFind: "الملاحظات والسلوك، في الشريط الجانبي.",
    },
  },
};
