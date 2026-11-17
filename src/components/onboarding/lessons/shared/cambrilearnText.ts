import type { LessonTexts } from "@/lib/onboarding/types";

export const cambrilearnText: LessonTexts = {
  en: {
    title: "CambriLearn",
    oneLiner: "Open CambriLearn's login page from inside the app.",
    what: [
      "CambriLearn is a separate website. Press Open CambriLearn to go to its login page. In a browser, this replaces the current page. In the installed app, how it opens depends on your device and browser.",
      "Sign in there with your CambriLearn email and password, not your Al Kamal account. To return to Al Kamal, use Back. If CambriLearn opens in a separate view, dismiss that view. If needed, reopen Al Kamal.",
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
      "CambriLearn موقع مستقل. اضغط «فتح CambriLearn» للانتقال إلى صفحة تسجيل الدخول الخاصة به. في المتصفح، تحلّ صفحة CambriLearn محل الصفحة الحالية. وفي التطبيق المثبّت، تختلف طريقة الفتح حسب جهازك ومتصفحك.",
      "سجّل الدخول هناك ببريدك الإلكتروني وكلمة مرورك لحساب CambriLearn، وليس ببيانات الكمال. للعودة إلى الكمال، استخدم زر الرجوع. إذا فتح CambriLearn في نافذة منفصلة، أغلق تلك النافذة. ويمكنك إعادة فتح تطبيق الكمال عند الحاجة.",
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
