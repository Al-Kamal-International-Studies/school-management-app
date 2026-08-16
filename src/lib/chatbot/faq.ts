// ============================================================================
// Scoped, rule-based answer engine for the in-app help chatbot.
//
// Deliberately NOT a general-purpose AI — no external API calls, so nothing
// a user types ever leaves this app. It answers a fixed set of "how do I
// use this app" questions (tailored per role — teacher / student / parent),
// handles ordinary small talk so a conversation feels natural, and refuses
// anything that smells like a request for sensitive data (other people's
// records, credentials, financial/internal information).
//
// Bilingual (en/ar): every rule carries BOTH an English and an Arabic set of
// trigger keywords and BOTH an English and an Arabic answer. `LocalizedText`
// requiring both `en` and `ar` on every literal means a missing translation
// is a TypeScript compile error, not a silent English fallback — the same
// structural-typing trick `src/lib/i18n/dictionaries/ar.ts` uses against
// `en.ts`. The two languages are factually identical answers, just written
// the way a native speaker of each would actually phrase them.
// ============================================================================

import type { UserRole } from "@/lib/types/database.types";
import type { Locale } from "@/lib/i18n/locales";

export type ChatRole = Extract<UserRole, "teacher" | "student" | "parent">;

interface LocalizedText {
  en: string;
  ar: string;
}

const REFUSAL: LocalizedText = {
  en: "I can't help with that — I'm only able to answer questions about using this app (your own account and, if you're a parent, your linked child's records). For anything else, please contact your school administrator.",
  ar: "لا يمكنني المساعدة في ذلك — يمكنني فقط الإجابة عن الأسئلة المتعلقة باستخدام هذا التطبيق (حسابك الخاص، وإن كنت وليّ أمر، سجلات ابنك المرتبط بحسابك). لأي أمر آخر، يُرجى التواصل مع إدارة المدرسة.",
};

const FALLBACK: LocalizedText = {
  en: "I'm not sure about that one. I can help with things like: timetable, attendance, assignments, exams, grades, progress, leave requests, the calendar, documents, messaging, feedback, or your account settings. Try asking about one of those!",
  ar: "لست متأكدًا من إجابة هذا السؤال. يمكنني مساعدتك في أمور مثل: الجدول الزمني، الحضور والغياب، الواجبات، الاختبارات، الدرجات، التقدم الدراسي، طلبات الإجازة، التقويم، المستندات، المراسلة، الملاحظات، أو إعدادات حسابك. جرّب أن تسألني عن أحد هذه الأمور!",
};

type Answer = LocalizedText | ((role: ChatRole) => LocalizedText);

interface Rule {
  keywords: { en: string[]; ar: string[] };
  answer: Answer;
}

function resolve(answer: Answer, role: ChatRole): LocalizedText {
  return typeof answer === "function" ? answer(role) : answer;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matching, not naive substring — a naive `.includes("hi")`
// would false-positive on the word "this" (contains "hi"), "help" on
// "helpful", etc. This is a real bug the original naive-substring version
// had; fixed here.
//
// Uses Unicode-property lookaround (`\p{L}`/`\p{N}`) rather than plain `\b`.
// JS's `\b` is defined purely in terms of ASCII `\w` ([A-Za-z0-9_]) — Arabic
// letters never count as "word characters" to it, so `\b` never matches
// anywhere inside (or even at the edges of) a pure-Arabic string. A regex
// built from plain `\b` would silently never match any Arabic keyword at
// all. `\p{L}`/`\p{N}` (with the `u` flag) correctly treat Arabic letters as
// word characters too, so boundary detection works the same way in both
// languages — verified against both "سلام" not false-positiving inside
// "السلام" and "hi" not false-positiving inside "this".
function textMatches(text: string, keyword: string): boolean {
  const escaped = escapeRegExp(keyword);
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu").test(text);
}

function forRole<T>(role: ChatRole, opts: { teacher: T; student: T; parent: T }): T {
  return opts[role];
}

// Checked first, and win regardless of any FAQ match on the same message.
const SENSITIVE_RULES: Rule[] = [
  {
    keywords: {
      en: [
        "password of", "someone else", "other student", "other teacher", "another student",
        "another teacher", "other parent", "another parent", "other child", "another child",
        "classmate's", "admin credentials", "admin password",
        "database", "api key", "supabase", "backend", "server", "source code",
        "salary", "revenue", "profit", "budget", "financial statement", "how much does the school make",
        "investor", "business plan", "bank account", "social security", "ssn", "passport number",
        "phone number of", "address of", "email of",
      ],
      ar: [
        "كلمة مرور شخص آخر", "كلمة مرور طالب آخر", "كلمة مرور معلم آخر",
        "شخص آخر", "طالب آخر", "طالبة أخرى", "معلم آخر", "معلمة أخرى",
        "ولي أمر آخر", "ولية أمر أخرى", "طفل آخر", "ابن آخر",
        "زميلي في الصف", "زميلتي في الصف",
        "بيانات اعتماد الإدارة", "كلمة مرور الإدارة",
        "قاعدة البيانات", "مفتاح API", "مفتاح الواجهة البرمجية", "الخادم الخلفي", "الخادم", "الكود المصدري", "الشيفرة المصدرية",
        "الراتب", "الإيرادات", "الأرباح", "الميزانية", "البيان المالي", "كم تربح المدرسة",
        "مستثمر", "خطة العمل", "حساب بنكي", "الضمان الاجتماعي", "رقم جواز السفر",
        "رقم هاتف شخص آخر", "عنوان شخص آخر", "بريد شخص آخر",
      ],
    },
    answer: REFUSAL,
  },
];

const FAQ_RULES: Rule[] = [
  {
    keywords: {
      en: ["who are you", "what are you", "your name"],
      ar: ["من أنت", "من انت", "ما اسمك", "شو اسمك", "ما هويتك"],
    },
    answer: {
      en: "I'm your in-app assistant — here to help you find your way around Al Kamal International Studies' school management app. Ask me about your timetable, attendance, grades, or your account.",
      ar: "أنا مساعدك داخل التطبيق — هنا لمساعدتك على التنقل في نظام إدارة مدرسة Al Kamal International Studies. اسألني عن جدولك الزمني، أو الحضور والغياب، أو درجاتك، أو حسابك.",
    },
  },
  {
    keywords: {
      en: ["timetable", "schedule", "what class", "what time", "next class", "today's class", "today class"],
      ar: ["الجدول الزمني", "الجدول الدراسي", "الحصص", "أي حصة", "أي مادة الآن", "الحصة القادمة", "حصص اليوم", "جدولي"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "You can see your full weekly teaching timetable from “My Timetable” in the sidebar. Today's classes are also shown right on your dashboard.",
          ar: "يمكنك الاطلاع على جدولك التدريسي الأسبوعي كاملًا من «جدولي الزمني» في القائمة الجانبية. كما تظهر حصص اليوم مباشرة في لوحة التحكم الخاصة بك.",
        },
        student: {
          en: "You can see your full weekly timetable from “My Timetable” in the sidebar. Today's classes are also shown right on your dashboard.",
          ar: "يمكنك الاطلاع على جدولك الزمني الأسبوعي كاملًا من «جدولي الزمني» في القائمة الجانبية. كما تظهر حصص اليوم مباشرة في لوحة التحكم الخاصة بك.",
        },
        parent: {
          en: "The parent portal doesn't show the full class timetable yet — but you can see your child's upcoming exams and assignment due dates right on their dashboard. For the full weekly schedule, please contact the school office.",
          ar: "لا تعرض بوابة أولياء الأمور الجدول الزمني الكامل للفصل حتى الآن — لكن يمكنك الاطلاع على اختبارات ابنك القادمة ومواعيد تسليم واجباته مباشرة في لوحة تحكمه. للحصول على الجدول الأسبوعي الكامل، يُرجى التواصل مع إدارة المدرسة.",
        },
      }),
  },
  {
    keywords: {
      en: ["attendance", "absent", "present", "how many days"],
      ar: ["الحضور", "الغياب", "غائب", "حاضر", "كم يوم", "نسبة الحضور"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Mark attendance for your classes from “Attendance” in the sidebar — pick a class and date, then set each student to present, absent, late, or excused.",
          ar: "سجّل حضور طلابك من «الحضور والغياب» في القائمة الجانبية — اختر الفصل والتاريخ، ثم حدّد حالة كل طالب: حاضر، غائب، متأخر، أو معذور.",
        },
        student: {
          en: "You can see your attendance history and overall attendance rate from “Attendance” in the sidebar.",
          ar: "يمكنك الاطلاع على سجل حضورك ونسبة حضورك الإجمالية من «الحضور والغياب» في القائمة الجانبية.",
        },
        parent: {
          en: "Your child's attendance rate is shown right on their dashboard in the parent portal.",
          ar: "تظهر نسبة حضور ابنك مباشرة في لوحة تحكمه ضمن بوابة أولياء الأمور.",
        },
      }),
  },
  {
    keywords: {
      en: ["assignment", "homework"],
      ar: ["الواجب", "الواجبات", "الواجب المنزلي", "الفرض"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Create and grade assignments from “Assignments” in the sidebar.",
          ar: "أنشئ الواجبات وقيّمها من «الواجبات» في القائمة الجانبية.",
        },
        student: {
          en: "See your assignments from “Assignments” in the sidebar, and mark one as submitted once you've turned it in — your teacher will grade it there too.",
          ar: "اطّلع على واجباتك من «الواجبات» في القائمة الجانبية، وضع علامة «تم التسليم» على الواجب فور تسليمه — سيقوم معلمك بتقييمه من هناك أيضًا.",
        },
        parent: {
          en: "Upcoming assignments and due dates for your child are listed right on their dashboard.",
          ar: "تظهر واجبات ابنك القادمة ومواعيد تسليمها مباشرة في لوحة تحكمه.",
        },
      }),
  },
  {
    keywords: {
      en: ["exam", "quiz", "test date", "upcoming test"],
      ar: ["الاختبار", "الامتحان", "اختبار قصير", "موعد الاختبار", "الاختبار القادم"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Schedule exams and quizzes for your classes from “Exams” in the sidebar.",
          ar: "حدّد مواعيد الاختبارات والاختبارات القصيرة لفصولك من «الاختبارات» في القائمة الجانبية.",
        },
        student: {
          en: "See upcoming exams and quizzes from “Exams” in the sidebar.",
          ar: "اطّلع على الاختبارات والاختبارات القصيرة القادمة من «الاختبارات» في القائمة الجانبية.",
        },
        parent: {
          en: "Upcoming exams for your child are listed right on their dashboard.",
          ar: "تظهر اختبارات ابنك القادمة مباشرة في لوحة تحكمه.",
        },
      }),
  },
  {
    keywords: {
      en: ["grade", "grades", "marks", "report card", "exam result", "my score"],
      ar: ["الدرجة", "الدرجات", "العلامات", "بطاقة التقرير", "نتيجة الاختبار", "درجتي"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Record grades for an assessment from “Grades” in the sidebar — pick the student and subject, then enter the marks.",
          ar: "سجّل درجات أي تقييم من «الدرجات» في القائمة الجانبية — اختر الطالب والمادة، ثم أدخل العلامات.",
        },
        student: {
          en: "See your recorded grades from “Grades” in the sidebar.",
          ar: "اطّلع على درجاتك المسجّلة من «الدرجات» في القائمة الجانبية.",
        },
        parent: {
          en: "Your child's recent grades are shown right on their dashboard.",
          ar: "تظهر أحدث درجات ابنك مباشرة في لوحة تحكمه.",
        },
      }),
  },
  {
    keywords: {
      en: ["progress", "progress score", "progress ring", "overall score"],
      ar: ["التقدم", "التقدم الدراسي", "درجة التقدم", "التقييم العام"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Submit a student's monthly progress (attendance, homework, participation, behaviour, assessments, and subject understanding) from “Progress” in the sidebar.",
          ar: "أرسل تقييم التقدم الشهري للطالب (الحضور، الواجبات، المشاركة، السلوك، التقييمات، وفهم المادة) من «التقدم» في القائمة الجانبية.",
        },
        student: {
          en: "Your overall progress score and monthly trend are shown right on your dashboard.",
          ar: "تظهر درجة تقدمك العامة واتجاهها الشهري مباشرة في لوحة التحكم الخاصة بك.",
        },
        parent: {
          en: "Your child's overall progress score for the month is shown right on their dashboard.",
          ar: "تظهر درجة تقدم ابنك العامة لهذا الشهر مباشرة في لوحة تحكمه.",
        },
      }),
  },
  {
    keywords: {
      en: ["remark", "behaviour", "behavior", "conduct", "discipline"],
      ar: ["ملاحظة سلوكية", "الملاحظات السلوكية", "السلوك", "الانضباط", "مذكرة سلوك", "تصرف الطالب", "سوء السلوك"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Add a remark or log a behaviour note for a student from “Remarks & Behaviour” in the sidebar.",
          ar: "أضف ملاحظة أو سجّل مذكرة سلوكية لطالب من «الملاحظات والسلوك» في القائمة الجانبية.",
        },
        student: {
          en: "Any remarks or behaviour notes your teachers add for you show up right on your dashboard.",
          ar: "تظهر أي ملاحظات أو مذكرات سلوكية يضيفها معلموك مباشرة في لوحة التحكم الخاصة بك.",
        },
        parent: {
          en: "Teacher remarks and behaviour notes for your child appear right on their dashboard.",
          ar: "تظهر ملاحظات المعلمين والمذكرات السلوكية الخاصة بابنك مباشرة في لوحة تحكمه.",
        },
      }),
  },
  {
    keywords: {
      en: ["leave", "absence", "excuse", "sick day", "time off"],
      ar: ["الإجازة", "إجازة", "استئذان", "عذر", "يوم مرضي", "غياب"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Leave requests are submitted by students (or their parent) and reviewed by the school admin — you don't need to do anything for those.",
          ar: "يقدّم الطلاب (أو أولياء أمورهم) طلبات الإجازة، وتراجعها إدارة المدرسة — لا حاجة لأي إجراء من جانبك بخصوصها.",
        },
        student: {
          en: "Submit a leave request from “Leave Requests” in the sidebar — you'll see whether it's pending, approved, or rejected right there.",
          ar: "قدّم طلب إجازة من «طلبات الإجازة» في القائمة الجانبية — وستتمكن من متابعة حالته هناك: قيد الانتظار، مقبول، أو مرفوض.",
        },
        parent: {
          en: "You can submit a leave request for your child right from their dashboard, and see its status there too.",
          ar: "يمكنك تقديم طلب إجازة لابنك مباشرة من لوحة تحكمه، ومتابعة حالته من هناك أيضًا.",
        },
      }),
  },
  {
    keywords: {
      en: ["calendar", "holiday", "school event", "deadline"],
      ar: ["التقويم", "العطلة", "فعالية مدرسية", "الموعد النهائي"],
    },
    answer: {
      en: "Check “Calendar” in the sidebar for upcoming school events, holidays, and deadlines.",
      ar: "تفقّد «التقويم» في القائمة الجانبية للاطلاع على الفعاليات المدرسية القادمة والعطلات والمواعيد النهائية.",
    },
  },
  {
    keywords: {
      en: ["document", "admit card", "certificate", "policy", "report card download"],
      ar: ["المستند", "المستندات", "بطاقة الدخول", "الشهادة", "السياسة", "تحميل بطاقة التقرير"],
    },
    answer: {
      en: "Download admit cards, report cards, certificates, or school policies from “Documents” in the sidebar.",
      ar: "حمّل بطاقات الدخول، وبطاقات التقارير، والشهادات، أو سياسات المدرسة من «المستندات» في القائمة الجانبية.",
    },
  },
  {
    keywords: {
      en: ["message", "messaging", "dm", "direct message", "chat with my teacher", "chat with a teacher"],
      ar: ["الرسالة", "الرسائل", "مراسلة", "تواصل مع المعلم", "دردشة مع المعلم"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Message your students, their parents, or the school admin from “Messages” in the sidebar.",
          ar: "راسل طلابك، أو أولياء أمورهم، أو إدارة المدرسة من «الرسائل» في القائمة الجانبية.",
        },
        student: {
          en: "Message your teachers or the school admin from “Messages” in the sidebar.",
          ar: "راسل معلميك أو إدارة المدرسة من «الرسائل» في القائمة الجانبية.",
        },
        parent: {
          en: "Message your child's teachers or the school admin from “Messages” in the sidebar.",
          ar: "راسل معلمي ابنك أو إدارة المدرسة من «الرسائل» في القائمة الجانبية.",
        },
      }),
  },
  {
    keywords: {
      en: ["feedback", "suggestion", "report a bug", "report an issue"],
      ar: ["اقتراح", "تعليق على التطبيق", "الإبلاغ عن خطأ", "الإبلاغ عن مشكلة", "أرسل ملاحظاتك", "شارك رأيك"],
    },
    answer: {
      en: "Share a suggestion or report an issue from “Feedback” in the sidebar — pick a category, add a subject and message, and submit.",
      ar: "شارك اقتراحًا أو أبلغ عن مشكلة من «الملاحظات» في القائمة الجانبية — اختر الفئة، وأضف عنوانًا ورسالة، ثم أرسل.",
    },
  },
  {
    keywords: {
      en: ["notification", "push notification", "enable notifications", "alerts"],
      ar: ["الإشعار", "الإشعارات", "إشعارات الدفع", "تفعيل الإشعارات", "التنبيهات"],
    },
    answer: {
      en: "Turn on push notifications from “Settings” in the sidebar — you'll get an alert for new announcements and messages.",
      ar: "فعّل إشعارات الدفع من «الإعدادات» في القائمة الجانبية — ستصلك تنبيهات عند وجود إعلانات أو رسائل جديدة.",
    },
  },
  {
    keywords: {
      en: ["dark mode", "light mode", "theme", "dark theme"],
      ar: ["الوضع الداكن", "الوضع الليلي", "الوضع الفاتح", "المظهر", "السمة الداكنة"],
    },
    answer: {
      en: "Switch between light and dark mode from “Settings” in the sidebar.",
      ar: "بدّل بين الوضعين الفاتح والداكن من «الإعدادات» في القائمة الجانبية.",
    },
  },
  {
    keywords: {
      en: ["language", "switch language", "change language"],
      ar: ["اللغة", "العربية", "تغيير اللغة", "لغة التطبيق", "الإنجليزية"],
    },
    answer: {
      en: "Switch the app's language between English and العربية from “Settings” in the sidebar.",
      ar: "بدّل لغة التطبيق بين الإنجليزية والعربية من «الإعدادات» في القائمة الجانبية.",
    },
  },
  {
    keywords: {
      en: ["change my password", "reset my password", "forgot my password", "forgot password", "update my password"],
      ar: ["تغيير كلمة المرور", "إعادة تعيين كلمة المرور", "نسيت كلمة المرور", "تحديث كلمة المرور", "كلمة السر"],
    },
    answer: {
      en: "You can set a new password anytime from “Settings” in the sidebar. If you're signed out and can't remember your current one, use “Forgot password?” on the sign-in page instead.",
      ar: "يمكنك تعيين كلمة مرور جديدة في أي وقت من «الإعدادات» في القائمة الجانبية. أما إذا كنت مسجّلًا خروجًا ولا تتذكر كلمة المرور الحالية، فاستخدم رابط «نسيت كلمة المرور؟» في صفحة تسجيل الدخول.",
    },
  },
  {
    keywords: {
      en: ["profile picture", "profile photo", "avatar", "change my photo", "upload photo"],
      ar: ["الصورة الشخصية", "صورة الملف الشخصي", "الصورة الرمزية", "تغيير صورتي", "رفع صورة"],
    },
    answer: {
      en: "Go to “My Profile” (click your name/photo in the top bar), then click your avatar to upload a new photo. JPG, PNG, or WEBP under 4MB.",
      ar: "توجّه إلى «ملفي الشخصي» (اضغط على اسمك/صورتك في الشريط العلوي)، ثم اضغط على صورتك الرمزية لرفع صورة جديدة. بصيغة JPG أو PNG أو WEBP وبحجم أقل من 4 ميجابايت.",
    },
  },
  {
    keywords: {
      en: ["update my phone", "change my phone", "change my number", "update my name", "change my name"],
      ar: ["تحديث رقم هاتفي", "تغيير رقم هاتفي", "تغيير رقمي", "تحديث اسمي", "تغيير اسمي"],
    },
    answer: {
      en: "Go to “My Profile” (click your name/photo in the top bar) — you can edit your name and phone number there. Your email and date of birth can only be changed by your administrator.",
      ar: "توجّه إلى «ملفي الشخصي» (اضغط على اسمك/صورتك في الشريط العلوي) — يمكنك تعديل اسمك ورقم هاتفك من هناك. أما بريدك الإلكتروني وتاريخ ميلادك فلا يمكن تغييرهما إلا عبر إدارة المدرسة.",
    },
  },
  {
    keywords: {
      en: ["my class", "my students", "which classes do i teach", "my subject"],
      ar: ["فصلي", "طلابي", "ما الفصول التي أدرّسها", "موادي", "أي فصول أدرّس"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "You can see all your assigned classes and subjects on your dashboard, under “My Classes”.",
          ar: "يمكنك الاطلاع على جميع الفصول والمواد المسندة إليك في لوحة التحكم الخاصة بك، ضمن «فصولي».",
        },
        student: {
          en: "Your class and enrollment details are shown on your dashboard.",
          ar: "تظهر تفاصيل فصلك وقيدك الدراسي في لوحة التحكم الخاصة بك.",
        },
        parent: {
          en: "Your child's class is shown at the top of their dashboard in the parent portal.",
          ar: "يظهر فصل ابنك أعلى لوحة تحكمه ضمن بوابة أولياء الأمور.",
        },
      }),
  },
  {
    keywords: {
      en: ["my child", "switch child", "another child", "different child", "my children"],
      ar: ["ابني", "ابنتي", "تبديل الطفل", "طفل آخر", "أبنائي", "تغيير الطفل"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "That's a question for a parent account — I'm set up to help with your teaching account here.",
          ar: "هذا سؤال يخص حساب ولي الأمر — أنا مُعدّ لمساعدتك بخصوص حسابك كمعلم هنا.",
        },
        student: {
          en: "That's a question for a parent account — I'm set up to help with your student account here.",
          ar: "هذا سؤال يخص حساب ولي الأمر — أنا مُعدّ لمساعدتك بخصوص حسابك كطالب هنا.",
        },
        parent: {
          en: "If you have more than one child linked to your account, you'll see a row of name tabs at the top of the parent dashboard — tap a child's name to switch to their records.",
          ar: "إذا كان لديك أكثر من طفل مرتبط بحسابك، سترى صفًا من الأسماء أعلى لوحة تحكم ولي الأمر — اضغط على اسم الطفل للتبديل إلى سجلاته.",
        },
      }),
  },
  {
    keywords: {
      en: ["contact admin", "contact school", "contact the office", "talk to a human", "talk to admin", "help from admin"],
      ar: ["تواصل مع الإدارة", "تواصل مع المدرسة", "تواصل مع المكتب", "التحدث مع شخص", "التحدث مع الإدارة", "مساعدة من الإدارة"],
    },
    answer: {
      en: "For anything I can't help with, please reach out to your school administrator directly — they can assist with account issues, records, and anything outside what I can answer here. You can also find the school's phone and email under “Settings” → “Contact Us”.",
      ar: "بالنسبة لأي أمر لا أستطيع مساعدتك فيه، يُرجى التواصل مباشرة مع إدارة المدرسة — فهي قادرة على مساعدتك في مسائل الحساب والسجلات وأي أمر آخر خارج نطاق إجاباتي هنا. يمكنك أيضًا العثور على رقم هاتف المدرسة وبريدها الإلكتروني ضمن «الإعدادات» ← «تواصل معنا».",
    },
  },
  {
    keywords: {
      en: ["sign out", "log out", "logout"],
      ar: ["تسجيل الخروج", "الخروج من الحساب", "خروج"],
    },
    answer: {
      en: "Click “Sign out” in the top-right corner of the top bar to log out of your account.",
      ar: "اضغط على «تسجيل الخروج» في الشريط العلوي لتسجيل الخروج من حسابك.",
    },
  },
  {
    keywords: {
      en: ["what can you do", "how do i use this", "how does this work"],
      ar: ["ما الذي تستطيع فعله", "ماذا تستطيع أن تفعل", "كيف أستخدم هذا", "كيف يعمل هذا", "كيف أستخدم التطبيق"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "I can help with using this app as a teacher — attendance, assignments, exams, grades, progress, remarks, your timetable, messaging, or your account. What would you like to know?",
          ar: "يمكنني مساعدتك في استخدام هذا التطبيق كمعلم — الحضور والغياب، الواجبات، الاختبارات، الدرجات، التقدم الدراسي، الملاحظات السلوكية، جدولك الزمني، المراسلة، أو حسابك. ما الذي تودّ معرفته؟",
        },
        student: {
          en: "I can help with using this app as a student — your timetable, attendance, assignments, exams, grades, progress, leave requests, or your account. What would you like to know?",
          ar: "يمكنني مساعدتك في استخدام هذا التطبيق كطالب — جدولك الزمني، الحضور والغياب، الواجبات، الاختبارات، الدرجات، التقدم الدراسي، طلبات الإجازة، أو حسابك. ما الذي تودّ معرفته؟",
        },
        parent: {
          en: "I can help with using the parent portal — your child's attendance, progress, grades, assignments, exams, leave requests, or your own account. What would you like to know?",
          ar: "يمكنني مساعدتك في استخدام بوابة أولياء الأمور — حضور ابنك، تقدمه الدراسي، درجاته، واجباته، اختباراته، طلبات إجازته، أو حسابك الخاص. ما الذي تودّ معرفته؟",
        },
      }),
  },

  // ---- Small talk, so a conversation feels normal rather than robotic ----
  {
    keywords: {
      en: ["good morning", "good afternoon", "good evening", "hello", "hi", "hey", "salam", "assalamu", "yo"],
      ar: ["صباح الخير", "مساء الخير", "السلام عليكم", "سلام", "مرحبا", "مرحبًا", "أهلا", "أهلًا", "هاي"],
    },
    answer: (role) =>
      forRole<LocalizedText>(role, {
        teacher: {
          en: "Hello! How can I help with your teaching account today?",
          ar: "مرحبًا! كيف يمكنني مساعدتك بخصوص حسابك كمعلم اليوم؟",
        },
        student: {
          en: "Hi there! What can I help you with in the app today?",
          ar: "أهلًا بك! بماذا يمكنني مساعدتك في التطبيق اليوم؟",
        },
        parent: {
          en: "Hello! Happy to help with anything on your child's dashboard or your account today.",
          ar: "مرحبًا! يسعدني مساعدتك في أي شيء يخص لوحة تحكم ابنك أو حسابك اليوم.",
        },
      }),
  },
  {
    keywords: {
      en: ["how are you", "how's it going", "how you doing", "whats up", "what's up"],
      ar: ["كيف حالك", "كيف الحال", "كيفك", "شو الأخبار", "ايش الأخبار"],
    },
    answer: {
      en: "I'm doing well, thanks for asking! I'm here whenever you need a hand with the app — what can I help with?",
      ar: "أنا بخير، شكرًا لسؤالك! أنا هنا كلما احتجت إلى مساعدة في التطبيق — بماذا يمكنني مساعدتك؟",
    },
  },
  {
    keywords: {
      en: ["thank", "thanks", "shukran", "appreciate it"],
      ar: ["شكرا", "شكرًا", "شكرا لك", "أقدر لك"],
    },
    answer: {
      en: "You're very welcome! Let me know if there's anything else about the app I can help with.",
      ar: "على الرحب والسعة! أخبرني إن كان هناك أي شيء آخر يخص التطبيق يمكنني مساعدتك فيه.",
    },
  },
  {
    keywords: {
      en: ["sorry", "my bad", "my mistake"],
      ar: ["آسف", "عذرا", "عذرًا", "خطئي", "غلطتي"],
    },
    answer: {
      en: "No worries at all! What can I help you with?",
      ar: "لا داعي للقلق أبدًا! بماذا يمكنني مساعدتك؟",
    },
  },
  {
    keywords: {
      en: ["okay", "ok thanks", "sounds good", "got it", "alright", "cool", "great thanks", "perfect"],
      ar: ["حسنا", "حسنًا", "تمام", "فهمت", "ممتاز", "رائع شكرا"],
    },
    answer: {
      en: "Great! Anything else I can help with?",
      ar: "رائع! هل هناك أي شيء آخر يمكنني مساعدتك فيه؟",
    },
  },
  {
    keywords: {
      en: ["bye", "goodbye", "see you", "see ya", "later", "have a good day", "have a nice day"],
      ar: ["مع السلامة", "إلى اللقاء", "وداعا", "وداعًا", "نراك لاحقا", "يوما سعيدا"],
    },
    answer: {
      en: "Goodbye! Come back anytime you have a question about the app. Have a great day!",
      ar: "مع السلامة! عد في أي وقت يكون لديك سؤال عن التطبيق. أتمنى لك يومًا سعيدًا!",
    },
  },
  {
    keywords: {
      en: ["are you real", "are you a robot", "are you human", "are you ai", "are you a bot"],
      ar: ["هل أنت حقيقي", "هل أنت روبوت", "هل أنت إنسان", "هل أنت ذكاء اصطناعي", "هل أنت بوت"],
    },
    answer: {
      en: "I'm a scripted assistant built into this app, not a general AI — I only know how to answer questions about using this app, and I never send anything you type anywhere outside it.",
      ar: "أنا مساعد مبرمج مدمج في هذا التطبيق، ولست ذكاءً اصطناعيًا عامًا — لا أعرف سوى الإجابة عن الأسئلة المتعلقة باستخدام هذا التطبيق، ولا أرسل أي شيء تكتبه إلى أي جهة خارج التطبيق.",
    },
  },
  {
    keywords: {
      en: ["joke", "tell me a joke", "make me laugh"],
      ar: ["نكتة", "احكي لي نكتة", "أضحكني"],
    },
    answer: {
      en: "I'm better at timetables than punchlines, I'm afraid! But I'm always glad to help you find your way around the app.",
      ar: "أنا أبرع في الجداول الزمنية مني في النكات، للأسف! لكن يسعدني دائمًا مساعدتك على التنقل في التطبيق.",
    },
  },
];

/**
 * Returns the assistant's reply for a given user message, tailored to the
 * asker's role (teacher / student / parent) and written in the given
 * locale. Sensitive-topic refusals are role-independent (but still
 * locale-dependent) and always checked first.
 */
export function getFaqAnswer(userMessage: string, role: ChatRole, locale: Locale): string {
  const text = userMessage.toLowerCase();

  for (const rule of SENSITIVE_RULES) {
    if (rule.keywords[locale].some((k) => textMatches(text, k))) return resolve(rule.answer, role)[locale];
  }
  for (const rule of FAQ_RULES) {
    if (rule.keywords[locale].some((k) => textMatches(text, k))) return resolve(rule.answer, role)[locale];
  }
  return FALLBACK[locale];
}
