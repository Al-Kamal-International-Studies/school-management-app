import type { LessonTexts } from "@/lib/onboarding/types";

export const cambrilearnText: LessonTexts = {
  en: {
    title: "CambriLearn",
    oneLiner: "Open the CambriLearn login page in a new browser tab.",
    what: [
      "CambriLearn is a separate website. This page is a launcher: press Open CambriLearn and its own login page opens in a new browser tab.",
      "Sign in there with your CambriLearn email and password, not your Al Kamal account. CambriLearn opens in a new tab, so switch back to the Al Kamal tab when you want to return here.",
    ],
    useWhen: "you want to go to CambriLearn from inside the app.",
    visibility: {
      seenBy: ["Admins", "Teachers", "Students"],
      notSeenBy: ["Parents"],
      note: "Al Kamal never sees or stores your CambriLearn password. The button only opens CambriLearn's own login page.",
    },
    tasks: [
      { id: "open-portal", label: "Press Open CambriLearn", hint: "Press the Open CambriLearn button. In this practice, nothing really opens." },
    ],
    whereToFind: "CambriLearn, in the sidebar.",
  },
  ar: {
    title: "CambriLearn",
    oneLiner: "افتح صفحة تسجيل الدخول إلى CambriLearn في تبويبة جديدة بالمتصفح.",
    what: [
      "CambriLearn موقع مستقل. هذه الصفحة مجرد بوابة: اضغط «فتح CambriLearn» لتفتح صفحة تسجيل الدخول الخاصة به في تبويبة جديدة بالمتصفح.",
      "سجّل الدخول هناك ببريدك الإلكتروني وكلمة مرورك لحساب CambriLearn، وليس ببيانات الكمال. يفتح CambriLearn في تبويبة جديدة، فعد إلى تبويبة الكمال عندما تريد الرجوع إلى هنا.",
    ],
    useWhen: "تريد الانتقال إلى CambriLearn من داخل التطبيق.",
    visibility: {
      seenBy: ["المدراء", "المعلمون", "الطلاب"],
      notSeenBy: ["أولياء الأمور"],
      note: "لا يرى الكمال كلمة مرور CambriLearn الخاصة بك ولا يحفظها. الزر يفتح فقط صفحة تسجيل دخول CambriLearn.",
    },
    tasks: [
      { id: "open-portal", label: "اضغط «فتح CambriLearn»", hint: "اضغط زر «فتح CambriLearn». في التدريب لا يُفتح شيء فعلًا." },
    ],
    whereToFind: "CambriLearn، في القائمة الجانبية.",
  },
};
