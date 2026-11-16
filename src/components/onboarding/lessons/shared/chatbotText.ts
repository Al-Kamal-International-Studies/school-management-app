import type { LessonTexts } from "@/lib/onboarding/types";

export function chatbotText(): LessonTexts {
  return {
    en: {
      title: "Help assistant",
      oneLiner: "Ask a quick question about how to use the app.",
      what: [
        "The Help assistant answers short questions about using the app, such as where to find attendance, homework, documents or your settings. Pick Muhammad or Sheikha, then type your question.",
        "It is not a general AI. It matches your words against a fixed list of app questions for your role and language, and says so when it does not know. Each conversation allows 20 messages, and the box shows how many are left.",
      ],
      useWhen: "you can't find something in the app and want a quick pointer.",
      visibility: {
        seenBy: ["Only you"],
        notSeenBy: ["Admins", "Teachers, students and parents"],
        note: "Keep it to app questions. Please don't type personal or sensitive information.",
      },
      tasks: [
        { id: "pick", label: "Choose who to chat with", hint: "Press the Chat with button on Muhammad or Sheikha." },
        { id: "ask", label: "Ask a question and read the answer", hint: "Press one of the suggested questions, or type your own such as \"How do I change my password?\" and press Send." },
        { id: "unknown", label: "Ask something it can't answer", hint: "Press the weather question, or type something unrelated to the app, then read how it replies." },
      ],
      whereToFind: "Help Assistant, in the sidebar.",
    },
    ar: {
      title: "المساعد",
      oneLiner: "اطرح سؤالًا سريعًا عن طريقة استخدام التطبيق.",
      what: [
        "يجيب المساعد عن أسئلة قصيرة حول استخدام التطبيق، مثل مكان الحضور أو الواجبات أو المستندات أو الإعدادات. اختر محمد أو شيخة ثم اكتب سؤالك.",
        "المساعد ليس ذكاءً اصطناعيًا عامًا. فهو يطابق كلماتك مع قائمة ثابتة من أسئلة التطبيق حسب دورك ولغتك، ويخبرك عندما لا يعرف الإجابة. تسمح كل محادثة بـ 20 رسالة، ويعرض المربع عدد الرسائل المتبقية.",
      ],
      useWhen: "لا تجد شيئًا في التطبيق وتريد إرشادًا سريعًا.",
      visibility: {
        seenBy: ["أنت فقط"],
        notSeenBy: ["المدراء", "المعلمون والطلاب وأولياء الأمور"],
        note: "اقتصر على أسئلة التطبيق، ولا تكتب معلومات شخصية أو حساسة.",
      },
      tasks: [
        { id: "pick", label: "اختر من تتحدث معه", hint: "اضغط زر «الدردشة مع» عند محمد أو شيخة." },
        { id: "ask", label: "اطرح سؤالًا واقرأ الجواب", hint: "اضغط أحد الأسئلة المقترحة، أو اكتب سؤالك مثل «كيف أغيّر كلمة المرور؟» ثم اضغط إرسال." },
        { id: "unknown", label: "اسأل عن شيء لا يستطيع الإجابة عنه", hint: "اضغط سؤال الطقس، أو اكتب شيئًا لا علاقة له بالتطبيق، ثم اقرأ ردّه." },
      ],
      whereToFind: "المساعد، في القائمة الجانبية.",
    },
  };
}
