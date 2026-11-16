"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { pick, type L } from "./l10n";

const LIMIT = 20;

type Persona = "muhammad" | "sheikha";
const PERSONAS: { id: Persona; name: L; tone: string }[] = [
  { id: "muhammad", name: { en: "Muhammad", ar: "محمد" }, tone: "bg-navy-800 text-white dark:bg-navy-600" },
  { id: "sheikha", name: { en: "Sheikha", ar: "شيخة" }, tone: "bg-gold-600 text-white dark:bg-gold-700" },
];

interface Topic {
  keywords: { en: string[]; ar: string[] };
  answer: L | Partial<Record<Exclude<UserRole, "admin">, L>>;
}

const isL = (a: Topic["answer"]): a is L => "en" in a && "ar" in a;

/** Short paraphrases of the real FAQ topics. The real assistant is a keyword FAQ, not AI. */
const TOPICS: Topic[] = [
  {
    keywords: { en: ["attendance", "absent", "present"], ar: ["الحضور", "الغياب", "حضور", "غياب"] },
    answer: {
      teacher: { en: "Open Attendance in the sidebar, pick a class and a date, then set each student to present, absent, late or excused.", ar: "افتح «الحضور» من القائمة الجانبية، واختر الصف والتاريخ، ثم حدّد حالة كل طالب: حاضر أو غائب أو متأخر أو معذور." },
      student: { en: "See your attendance history and your attendance rate under Attendance in the sidebar.", ar: "اطّلع على سجل حضورك ونسبة حضورك من «الحضور» في القائمة الجانبية." },
      parent: { en: "Your child's attendance rate is shown on their dashboard in the parent portal.", ar: "تظهر نسبة حضور ابنك في لوحة تحكمه داخل بوابة أولياء الأمور." },
    },
  },
  {
    keywords: { en: ["homework", "assignment"], ar: ["الواجب", "الواجبات", "واجب"] },
    answer: {
      teacher: { en: "Create and grade assignments under Assignments in the sidebar.", ar: "أنشئ الواجبات وقيّمها من «الواجبات» في القائمة الجانبية." },
      student: { en: "See your assignments under Assignments in the sidebar, and mark one as submitted when you have handed it in.", ar: "اطّلع على واجباتك من «الواجبات» في القائمة الجانبية، وضع علامة «تم التسليم» عند تسليم الواجب." },
      parent: { en: "Your child's upcoming assignments and due dates are listed on their dashboard.", ar: "تظهر واجبات ابنك القادمة ومواعيد تسليمها في لوحة تحكمه." },
    },
  },
  {
    keywords: { en: ["leave", "time off", "excuse"], ar: ["الإجازة", "إجازة", "استئذان"] },
    answer: {
      teacher: { en: "Students or their parents submit leave requests and the school admin reviews them, so there is nothing for you to do.", ar: "يقدّم الطلاب أو أولياء أمورهم طلبات الإجازة وتراجعها إدارة المدرسة، فلا يلزمك أي إجراء." },
      student: { en: "Send a leave request under Leave Requests in the sidebar. You will see whether it is pending, approved or rejected.", ar: "أرسل طلب إجازة من «طلبات الإجازة» في القائمة الجانبية، وستتابع حالته: قيد الانتظار أو مقبول أو مرفوض." },
      parent: { en: "You can submit a leave request for your child from their dashboard and follow its status there.", ar: "يمكنك تقديم طلب إجازة لابنك من لوحة تحكمه ومتابعة حالته من هناك." },
    },
  },
  { keywords: { en: ["calendar", "holiday", "deadline"], ar: ["التقويم", "العطلة", "الموعد"] }, answer: { en: "Check Calendar in the sidebar for upcoming events, holidays and deadlines.", ar: "تفقّد «التقويم» في القائمة الجانبية لمعرفة الفعاليات والعطلات والمواعيد النهائية القادمة." } },
  { keywords: { en: ["document", "certificate", "policy"], ar: ["المستند", "المستندات", "الشهادة", "السياسة"] }, answer: { en: "Download report cards, certificates and school policies from Documents in the sidebar.", ar: "نزّل بطاقات التقارير والشهادات وسياسات المدرسة من «المستندات» في القائمة الجانبية." } },
  { keywords: { en: ["message", "chat with", "teacher"], ar: ["الرسالة", "الرسائل", "مراسلة"] }, answer: { en: "Use Messages in the sidebar to write to the people you are allowed to contact.", ar: "استخدم «الرسائل» في القائمة الجانبية لمراسلة الأشخاص المسموح لك بالتواصل معهم." } },
  { keywords: { en: ["feedback", "suggestion", "report a bug"], ar: ["اقتراح", "ملاحظات", "الإبلاغ عن"] }, answer: { en: "Share a suggestion or report a problem under Feedback in the sidebar: pick a category, add a subject and a message, then submit.", ar: "شارك اقتراحًا أو أبلغ عن مشكلة من «الملاحظات»: اختر الفئة وأضف الموضوع والرسالة ثم أرسل." } },
  { keywords: { en: ["notification", "alerts"], ar: ["الإشعار", "الإشعارات", "التنبيهات"] }, answer: { en: "Turn on push notifications under Settings in the sidebar to get alerts for announcements and messages.", ar: "فعّل الإشعارات من «الإعدادات» في القائمة الجانبية لتصلك تنبيهات الإعلانات والرسائل." } },
  { keywords: { en: ["dark mode", "theme", "light mode"], ar: ["الوضع الداكن", "المظهر", "الوضع الفاتح"] }, answer: { en: "Switch between light and dark under Settings in the sidebar.", ar: "بدّل بين الوضعين الفاتح والداكن من «الإعدادات» في القائمة الجانبية." } },
  { keywords: { en: ["language", "arabic", "english"], ar: ["اللغة", "العربية", "الإنجليزية"] }, answer: { en: "Change the app's language between English and Arabic under Settings in the sidebar.", ar: "غيّر لغة التطبيق بين الإنجليزية والعربية من «الإعدادات» في القائمة الجانبية." } },
  { keywords: { en: ["password"], ar: ["كلمة المرور", "كلمة السر"] }, answer: { en: "Set a new password any time under Settings in the sidebar. If you are signed out and have forgotten it, use Forgot password on the sign-in page.", ar: "عيّن كلمة مرور جديدة في أي وقت من «الإعدادات». وإذا كنت مسجّلًا خروجك ونسيتها فاستخدم «نسيت كلمة المرور؟» في صفحة تسجيل الدخول." } },
  { keywords: { en: ["contact admin", "contact the school", "talk to admin"], ar: ["تواصل مع الإدارة", "تواصل مع المدرسة"] }, answer: { en: "For anything I can't help with, contact your school administrator. The school's phone and email are under Settings, Contact Us.", ar: "لأي أمر لا أستطيع مساعدتك فيه تواصل مع إدارة المدرسة. ستجد هاتف المدرسة وبريدها في «الإعدادات» ثم «تواصل معنا»." } },
];

const FALLBACK: L = {
  en: "I'm not sure about that one. I can help with things like attendance, assignments, grades, leave requests, the calendar, documents, messaging, feedback or your account settings.",
  ar: "لست متأكدًا من إجابة هذا السؤال. يمكنني مساعدتك في أمور مثل الحضور والواجبات والدرجات وطلبات الإجازة والتقويم والمستندات والمراسلة والملاحظات وإعدادات حسابك.",
};

const SUGGESTED: Record<Exclude<UserRole, "admin">, L> = {
  teacher: { en: "How do I mark attendance?", ar: "كيف أسجّل الحضور؟" },
  student: { en: "Where do I see my homework?", ar: "أين أرى واجباتي؟" },
  parent: { en: "How do I ask for leave for my child?", ar: "كيف أطلب إجازة لابني؟" },
};
const SUGGESTED_OFF: L = { en: "What is the weather today?", ar: "كيف سيكون الطقس اليوم؟" };

function answerFor(text: string, role: Exclude<UserRole, "admin">, locale: "en" | "ar"): { reply: string; known: boolean } {
  const t = text.toLowerCase();
  for (const topic of TOPICS) {
    if (topic.keywords[locale].some((k) => t.includes(k.toLowerCase())) || topic.keywords.en.some((k) => t.includes(k.toLowerCase())) || topic.keywords.ar.some((k) => t.includes(k))) {
      const a = topic.answer;
      const l = isL(a) ? a : a[role];
      if (l) return { reply: l[locale], known: true };
    }
  }
  return { reply: FALLBACK[locale], known: false };
}

const UI = {
  en: {
    title: "Help Assistant",
    description: "Ask a quick question about using the app. Pick who you'd like to chat with. Each conversation is limited to 20 messages.",
    role: "Help Assistant",
    chatWith: "Chat with",
    askPrefix: "Ask",
    askSuffix: "about the app…",
    send: "Send",
    left: "{n} messages left in this conversation",
    oneLeft: "1 message left in this conversation",
    limit: "You've reached this conversation's message limit.",
    startNew: "Start a new conversation",
    disclaimer: "App questions only — not for personal or sensitive information.",
    try: "Try asking",
    you: "You",
  },
  ar: {
    title: "المساعد",
    description: "اطرح سؤالًا سريعًا حول استخدام التطبيق. اختر من تودّ الدردشة معه. كل محادثة محدودة بـ 20 رسالة.",
    role: "مساعد الدعم",
    chatWith: "الدردشة مع",
    askPrefix: "اسأل",
    askSuffix: "عن التطبيق…",
    send: "إرسال",
    left: "{n} رسائل متبقية في هذه المحادثة",
    oneLeft: "رسالة واحدة متبقية في هذه المحادثة",
    limit: "لقد وصلت إلى الحد الأقصى لرسائل هذه المحادثة.",
    startNew: "ابدأ محادثة جديدة",
    disclaimer: "أسئلة عن التطبيق فقط — وليس لمعلومات شخصية أو حساسة.",
    try: "جرّب أن تسأل",
    you: "أنت",
  },
} as const;

interface Bubble {
  id: number;
  from: "me" | "bot";
  text: string;
}

export default function ChatbotPractice({ role, locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const r = role === "admin" ? "teacher" : role;
  const [persona, setPersona] = useState<Persona | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [used, setUsed] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const id = useRef(1);
  const left = LIMIT - used;
  const name = persona ? pick(PERSONAS.find((p) => p.id === persona)!.name, locale) : "";

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [bubbles.length]);

  function ask(raw: string) {
    const q = raw.trim().slice(0, 500);
    if (!q || left <= 0) return;
    const { reply, known } = answerFor(q, r, locale);
    setBubbles((b) => [...b, { id: id.current++, from: "me", text: q }, { id: id.current++, from: "bot", text: reply }]);
    setUsed((n) => n + 1);
    setText("");
    completeTask(known ? "ask" : "unknown");
  }

  function reset() {
    setBubbles([]);
    setUsed(0);
  }

  if (!persona) {
    return (
      <PracticeFrame locale={locale} dir={dir} title={ui.title} description={ui.description}>
        <div className="grid gap-3 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <Card key={p.id} className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${p.tone}`}>
                  {pick(p.name, locale).slice(0, 1)}
                </span>
                <div>
                  <p className="font-semibold text-navy-900 dark:text-white">{pick(p.name, locale)}</p>
                  <p className="text-xs text-slate-500 dark:text-navy-300">{ui.role}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPersona(p.id);
                  completeTask("pick");
                }}
              >
                {ui.chatWith} {pick(p.name, locale)}
              </Button>
            </Card>
          ))}
        </div>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={`${ui.title}: ${name}`} description={ui.disclaimer}>
      <Card className="space-y-4 p-4">
        <div role="log" aria-live="polite" className="max-h-72 min-h-32 space-y-2 overflow-y-auto">
          {bubbles.length === 0 && <p className="text-sm text-slate-500 dark:text-navy-300">{level === "new" ? `${ui.try}:` : ""}</p>}
          {bubbles.map((b) => (
            <div key={b.id} className={`flex ${b.from === "me" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                  b.from === "me" ? "bg-navy-800 text-white dark:bg-navy-600" : "border border-slate-200 bg-white text-slate-800 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100"
                }`}
              >
                <bdi dir="auto">{b.text}</bdi>
              </p>
            </div>
          ))}
          <div ref={end} />
        </div>

        {left > 0 && (
          <div className="flex flex-wrap gap-2">
            {[SUGGESTED[r], SUGGESTED_OFF].map((s) => (
              <button
                key={s.en}
                type="button"
                onClick={() => ask(pick(s, locale))}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:border-navy-700 dark:text-navy-100 dark:hover:bg-navy-800"
              >
                {pick(s, locale)}
              </button>
            ))}
          </div>
        )}

        {left > 0 ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <div className="flex-1">
              <label htmlFor="practice-bot-input" className="sr-only">
                {`${ui.askPrefix} ${name} ${ui.askSuffix}`}
              </label>
              <input
                id="practice-bot-input"
                name="practice-bot-input"
                className="input"
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder={`${ui.askPrefix} ${name} ${ui.askSuffix}`}
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={!text.trim()} aria-label={ui.send}>
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-700 dark:text-navy-100">{ui.limit}</p>
            <Button type="button" variant="secondary" onClick={reset}>
              {ui.startNew}
            </Button>
          </div>
        )}
        {left > 0 && <p className="text-xs text-slate-500 dark:text-navy-300">{left === 1 ? ui.oneLeft : ui.left.replace("{n}", String(left))}</p>}
      </Card>
    </PracticeFrame>
  );
}
