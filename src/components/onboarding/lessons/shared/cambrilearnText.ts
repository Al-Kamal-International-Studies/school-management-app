import type { LessonTexts } from "@/lib/onboarding/types";

export const cambrilearnText: LessonTexts = {
  en: {
    title: "CambriLearn",
    oneLiner: "Open the CambriLearn login page in a new browser tab.",
    what: [
      "CambriLearn is a separate website. This page is a launcher: press Open CambriLearn and its own login page opens in a new browser tab.",
      "Sign in there with your CambriLearn username and password, not your Al Kamal ones. CambriLearn opens in a new tab, so switch back to the Al Kamal tab when you want to return here.",
    ],
    useWhen: "you want to go to CambriLearn from inside the app.",
    visibility: {
      seenBy: ["Admins", "Teachers", "Students"],
      notSeenBy: ["Parents"],
      note: "Al Kamal never sees or stores your CambriLearn password. The button only opens CambriLearn's own login page.",
    },
    tasks: [
      { id: "find-address", label: "Find out where the button goes", hint: "Press the address bar at the top of the browser window to see the web address." },
      { id: "open-portal", label: "Press Open CambriLearn", hint: "Press the Open CambriLearn button. In this practice, nothing really opens." },
    ],
    whereToFind: "CambriLearn, in the sidebar.",
  },
  ar: {
    title: "CambriLearn",
    oneLiner: "افتح صفحة تسجيل الدخول إلى CambriLearn في تبويبة جديدة بالمتصفح.",
    what: [
      "CambriLearn موقع مستقل. هذه الصفحة مجرد بوابة: اضغط «فتح CambriLearn» لتفتح صفحة تسجيل الدخول الخاصة به في تبويبة جديدة بالمتصفح.",
      "سجّل الدخول هناك باسم المستخدم وكلمة المرور الخاصين بـ CambriLearn، وليس بيانات الكمال. يفتح CambriLearn في تبويبة جديدة، فعد إلى تبويبة الكمال عندما تريد الرجوع إلى هنا.",
    ],
    useWhen: "تريد الانتقال إلى CambriLearn من داخل التطبيق.",
    visibility: {
      seenBy: ["المدراء", "المعلمون", "الطلاب"],
      notSeenBy: ["أولياء الأمور"],
      note: "لا يرى الكمال كلمة مرور CambriLearn الخاصة بك ولا يحفظها. الزر يفتح فقط صفحة تسجيل الدخول الخاصة بـ CambriLearn.",
    },
    tasks: [
      { id: "find-address", label: "اعرف إلى أين يذهب الزر", hint: "اضغط على شريط العنوان أعلى نافذة المتصفح لترى عنوان الموقع." },
      { id: "open-portal", label: "اضغط «فتح CambriLearn»", hint: "اضغط زر «فتح CambriLearn». في التدريب لا يُفتح شيء فعلًا." },
    ],
    whereToFind: "CambriLearn، في القائمة الجانبية.",
  },
};
