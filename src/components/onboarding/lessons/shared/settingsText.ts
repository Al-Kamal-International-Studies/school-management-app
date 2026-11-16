import type { LessonText, LessonTexts } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";

type Task = LessonText["tasks"][number];

const common = {
  notifications: {
    en: { id: "notifications", label: "Turn on notifications", hint: "Press Enable notifications in the Notifications card." } as Task,
    ar: { id: "notifications", label: "فعّل الإشعارات", hint: "اضغط «تفعيل الإشعارات» في بطاقة الإشعارات." } as Task,
  },
  devices: {
    en: { id: "devices", label: "Remove a device you no longer use", hint: "In the Devices card, press Remove next to Safari on iPhone." } as Task,
    ar: { id: "devices", label: "أزل جهازًا لم تعد تستخدمه", hint: "في بطاقة الأجهزة، اضغط «إزالة» بجانب سفاري على آيفون." } as Task,
  },
  password: {
    en: { id: "password", label: "Change your password", hint: "Type any current password, a new one of the required length and the same one again, then press Save." } as Task,
    ar: { id: "password", label: "غيّر كلمة المرور", hint: "اكتب أي كلمة مرور حالية، وكلمة جديدة بالطول المطلوب، ثم أعدها في خانة التأكيد، واضغط «حفظ»." } as Task,
  },
};

interface Cfg {
  oneEn: string;
  oneAr: string;
  secEn: string;
  secAr: string;
  useEn: string;
  useAr: string;
  noteEn: string;
  noteAr: string;
  extraEn: Task;
  extraAr: Task;
}

const CFG: Record<UserRole, Cfg> = {
  admin: {
    oneEn: "Your theme, language, password, devices, two-factor sign-in and notifications.",
    oneAr: "المظهر واللغة وكلمة المرور والأجهزة وتسجيل الدخول بخطوتين والإشعارات.",
    secEn: "Admin accounts need a password of at least 15 characters and two-factor authentication: after your password you enter a code from your authenticator app. If you switch phones or lose the app, use Reset device in the Two-factor authentication card to set up a new one.",
    secAr: "تتطلب حسابات المدراء كلمة مرور من 15 حرفًا على الأقل ومصادقة ثنائية: بعد كلمة المرور تُدخل رمزًا من تطبيق المصادقة. إذا غيّرت هاتفك أو فقدت التطبيق فاستخدم «إعادة تعيين الجهاز» في بطاقة المصادقة الثنائية لإعداد تطبيق جديد.",
    useEn: "you change phone, want a new password, or need to free a device slot.",
    useAr: "غيّرت هاتفك، أو تريد كلمة مرور جديدة، أو تحتاج إلى تحرير مكان لجهاز.",
    noteEn: "Careful: Reset device removes your authenticator and takes you straight to setting up a new one. In this practice nothing is really reset.",
    noteAr: "تنبيه: «إعادة تعيين الجهاز» تزيل تطبيق المصادقة الحالي وتنقلك مباشرة لإعداد تطبيق جديد. في هذا التدريب لا تتم إعادة تعيين حقيقية.",
    extraEn: { id: "twofactor", label: "Open the Reset device warning", hint: "In the Two-factor authentication card press Reset device, read the warning, then press Cancel." },
    extraAr: { id: "twofactor", label: "افتح تحذير إعادة تعيين الجهاز", hint: "في بطاقة المصادقة الثنائية اضغط «إعادة تعيين الجهاز»، واقرأ التحذير، ثم اضغط «إلغاء»." },
  },
  teacher: {
    oneEn: "Your theme, language, password, devices and notifications, plus faster sign-in.",
    oneAr: "المظهر واللغة وكلمة المرور والأجهزة والإشعارات، إضافةً إلى تسجيل دخول أسرع.",
    secEn: "Your password needs at least 12 characters. A day or two after you first sign in, the app offers a one-time \"Set up faster sign-in\" page with Face ID or fingerprint. You can answer \"Maybe later\", and the same option stays in Settings under Face ID / Fingerprint Sign-In.",
    secAr: "يجب ألا تقل كلمة المرور عن 12 حرفًا. بعد يوم أو يومين من أول تسجيل دخول يعرض التطبيق مرة واحدة صفحة «إعداد تسجيل دخول أسرع» ببصمة الوجه أو الإصبع. يمكنك اختيار «ربما لاحقًا»، ويبقى الخيار نفسه في الإعدادات تحت «تسجيل الدخول ببصمة الوجه / الإصبع».",
    useEn: "you get a new phone or laptop, want a new password, or want to sign in faster.",
    useAr: "حصلت على هاتف أو حاسوب جديد، أو تريد كلمة مرور جديدة، أو تسجيل دخول أسرع.",
    noteEn: "Settings changes only affect your own account.",
    noteAr: "تغييرات الإعدادات تخص حسابك أنت فقط.",
    extraEn: { id: "passkey", label: "Set up Face ID / fingerprint sign-in", hint: "In the Face ID / Fingerprint Sign-In card press Set up biometric sign-in." },
    extraAr: { id: "passkey", label: "أعدّ تسجيل الدخول ببصمة الوجه أو الإصبع", hint: "في بطاقة تسجيل الدخول ببصمة الوجه / الإصبع اضغط «إعداد تسجيل الدخول البيومتري»." },
  },
  student: {
    oneEn: "Your theme, language, password, devices and notifications.",
    oneAr: "المظهر واللغة وكلمة المرور والأجهزة والإشعارات.",
    secEn: "Students are not asked to change their password or set up extra security when signing in, but you can change your password here (at least 12 characters). Two rules still apply: an account can be signed in on up to 3 devices at once, and 3 wrong passwords in a row lock the account until an admin unlocks it.",
    secAr: "لا يُطلب من الطلاب تغيير كلمة المرور أو إعداد حماية إضافية عند تسجيل الدخول، لكن يمكنك تغيير كلمة مرورك هنا (12 حرفًا على الأقل). وما زالت قاعدتان سارية: يمكن تسجيل دخول الحساب على 3 أجهزة كحد أقصى في وقت واحد، وثلاث كلمات مرور خاطئة متتالية تقفل الحساب حتى يفتحه أحد المدراء.",
    useEn: "you want a new password, a different theme, or need to free a device slot.",
    useAr: "تريد كلمة مرور جديدة، أو مظهرًا مختلفًا، أو تحتاج إلى تحرير مكان لجهاز.",
    noteEn: "If your account is locked, ask the school office to unlock it.",
    noteAr: "إذا قُفل حسابك فاطلب من مكتب المدرسة فتحه.",
    extraEn: { id: "theme", label: "Switch to the Dark theme", hint: "In the Theme card press Dark." },
    extraAr: { id: "theme", label: "بدّل إلى المظهر الداكن", hint: "في بطاقة المظهر اضغط «داكن»." },
  },
  parent: {
    oneEn: "Your theme, language, password, devices and notifications.",
    oneAr: "المظهر واللغة وكلمة المرور والأجهزة والإشعارات.",
    secEn: "You choose a new password the first time you sign in, and you can change it here any time (at least 12 characters). An account can be signed in on up to 3 devices at once, and 3 wrong passwords in a row lock the account until an admin unlocks it.",
    secAr: "تختار كلمة مرور جديدة عند أول تسجيل دخول، ويمكنك تغييرها هنا في أي وقت (12 حرفًا على الأقل). يمكن تسجيل دخول الحساب على 3 أجهزة كحد أقصى في وقت واحد، وثلاث كلمات مرور خاطئة متتالية تقفل الحساب حتى يفتحه أحد المدراء.",
    useEn: "you want a new password, a different theme, or need to free a device slot.",
    useAr: "تريد كلمة مرور جديدة، أو مظهرًا مختلفًا، أو تحتاج إلى تحرير مكان لجهاز.",
    noteEn: "If your account is locked, contact the school office to unlock it.",
    noteAr: "إذا قُفل حسابك فتواصل مع مكتب المدرسة لفتحه.",
    extraEn: { id: "theme", label: "Switch to the Dark theme", hint: "In the Theme card press Dark." },
    extraAr: { id: "theme", label: "بدّل إلى المظهر الداكن", hint: "في بطاقة المظهر اضغط «داكن»." },
  },
};

export function settingsText(role: UserRole): LessonTexts {
  const c = CFG[role];
  return {
    en: {
      title: "Settings",
      oneLiner: c.oneEn,
      what: [
        "Settings holds the choices that belong to you: light or dark theme, English or Arabic, your password, the devices signed in to your account, and push notifications.",
        c.secEn,
        "The Devices card lists where you are signed in, up to 3 at a time. Removing one frees a slot. Notifications are switched on per browser or device, so turn them on again on each one you use.",
      ],
      useWhen: c.useEn,
      visibility: { seenBy: ["Only you"], notSeenBy: ["Other users", "Teachers and parents"], note: c.noteEn },
      tasks: [common.notifications.en, common.devices.en, common.password.en, c.extraEn],
      whereToFind: "Settings, at the bottom of the sidebar.",
    },
    ar: {
      title: "الإعدادات",
      oneLiner: c.oneAr,
      what: [
        "تضم الإعدادات الخيارات الخاصة بك: المظهر الفاتح أو الداكن، والعربية أو الإنجليزية، وكلمة المرور، والأجهزة المسجّل دخولها إلى حسابك، والإشعارات.",
        c.secAr,
        "تعرض بطاقة الأجهزة الأماكن التي سجّلت الدخول منها، بحد أقصى 3 في وقت واحد، وإزالة أحدها تحرّر مكانًا. وتُفعَّل الإشعارات لكل متصفح أو جهاز، لذا فعّلها من جديد على كل جهاز تستخدمه.",
      ],
      useWhen: c.useAr,
      visibility: { seenBy: ["أنت فقط"], notSeenBy: ["المستخدمون الآخرون", "المعلمون وأولياء الأمور"], note: c.noteAr },
      tasks: [common.notifications.ar, common.devices.ar, common.password.ar, c.extraAr],
      whereToFind: "الإعدادات، في أسفل القائمة الجانبية.",
    },
  };
}
