import type { LessonTexts } from "@/lib/onboarding/types";

export function feedbackText(): LessonTexts {
  return {
    en: {
      title: "Feedback",
      oneLiner: "Tell the school about a problem or an idea.",
      what: [
        "Use Feedback to report something that doesn't work, a problem with a lesson or record, or an idea to improve the school and the app. Choose a category, write a subject and a message, and press Submit.",
        "Your feedback goes to the school's admins, who read it in their Feedback inbox and mark it New, Reviewed or Resolved. You can send up to 10 per hour. "
          + "Admins are not alerted when you submit, so for something urgent contact the office directly.",
      ],
      useWhen: "something is wrong in the app, or you have a suggestion.",
      visibility: { seenBy: ["You", "The school's admins"], notSeenBy: ["Other teachers, students and parents"], note: "Admins can see your name and email next to what you wrote." },
      tasks: [
        { id: "category", label: "Choose the Suggestion category", hint: "Open the Category box and pick Suggestion." },
        { id: "submit", label: "Write and submit feedback", hint: "Type a subject and a message, then press Submit. A green confirmation appears." },
      ],
      whereToFind: "Feedback, in the sidebar.",
    },
    ar: {
      title: "الملاحظات",
      oneLiner: "أخبر المدرسة عن مشكلة أو فكرة.",
      what: [
        "استخدم «الملاحظات» للإبلاغ عن شيء لا يعمل، أو مشكلة في درس أو سجل، أو فكرة لتحسين المدرسة والتطبيق. اختر الفئة، واكتب الموضوع والرسالة، ثم اضغط «إرسال».",
        "تصل ملاحظاتك إلى مدراء المدرسة، فيقرؤونها في صندوق الملاحظات ويعلّمونها: جديد أو تمت المراجعة أو تم الحل. يمكنك إرسال 10 ملاحظات كحد أقصى في الساعة. لا يصل المدراء تنبيه عند إرسالك، لذا تواصل مع المكتب مباشرة في الأمور العاجلة.",
      ],
      useWhen: "يوجد خطأ في التطبيق، أو لديك اقتراح.",
      visibility: { seenBy: ["أنت", "مدراء المدرسة"], notSeenBy: ["المعلمون والطلاب وأولياء الأمور الآخرون"], note: "يرى المدراء اسمك وبريدك الإلكتروني بجانب ما كتبته." },
      tasks: [
        { id: "category", label: "اختر فئة «اقتراح»", hint: "افتح مربع «الفئة» واختر «اقتراح»." },
        { id: "submit", label: "اكتب ملاحظة وأرسلها", hint: "اكتب الموضوع والرسالة ثم اضغط «إرسال». سيظهر تأكيد أخضر." },
      ],
      whereToFind: "الملاحظات، في القائمة الجانبية.",
    },
  };
}
