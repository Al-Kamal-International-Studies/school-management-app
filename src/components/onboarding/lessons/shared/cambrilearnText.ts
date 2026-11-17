import type { LessonTexts } from "@/lib/onboarding/types";

export const cambrilearnText: LessonTexts = {
  en: {
    title: "CambriLearn",
    oneLiner: "Open CambriLearn's login page from inside the app.",
    what: [
      "CambriLearn is a separate website. This page is a launcher: press Open CambriLearn and its own login page opens in the same window. In the installed Al Kamal app, it stays inside the app's window.",
      "Sign in there with your CambriLearn email and password, not your Al Kamal account. To come back to Al Kamal, use the back arrow or the close button at the top of the screen.",
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
    oneLiner: "افتح صفحة تسجيل الدخول إلى CambriLearn من داخل التطبيق.",
    what: [
      "CambriLearn موقع مستقل. هذه الصفحة مجرد بوابة: اضغط «فتح CambriLearn» لتفتح صفحة تسجيل الدخول الخاصة به في النافذة نفسها. وفي تطبيق الكمال المثبّت، يبقى داخل نافذة التطبيق.",
      "سجّل الدخول هناك ببريدك الإلكتروني وكلمة مرورك لحساب CambriLearn، وليس ببيانات الكمال. للعودة إلى الكمال، استخدم سهم الرجوع أو زر الإغلاق في أعلى الشاشة.",
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
