"use client";

import { useState, type FormEvent } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordField } from "@/components/ui/PasswordField";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { pick, type L } from "./l10n";

const UI = {
  en: {
    title: "Settings",
    subtitle: "Manage your preferences and account.",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    themeNote: "Practice only: this does not change the real app's theme.",
    language: "Language",
    langNote: "In the real app, choosing a language reloads the page in that language.",
    changePassword: "Change Password",
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    save: "Save",
    show: "Show password",
    hide: "Hide password",
    needCurrent: "Enter your current password.",
    tooShort: "Password must be at least {n} characters.",
    common: "That password is too common — choose something less guessable.",
    mismatch: "Passwords do not match.",
    updated: "Your password has been updated.",
    anyCurrent: "Practice only: any current password works here, nothing is saved.",
    passkeyTitle: "Face ID / Fingerprint Sign-In",
    passkeyDesc: "Add this device's Face ID, fingerprint, or Windows Hello for faster sign-in — no password needed on this device from now on.",
    passkeySetUp: "Set up biometric sign-in",
    passkeyDone: "Biometric sign-in is set up on this device.",
    passkeyNone: "No biometric sign-in set up yet.",
    devices: "Devices",
    devicesDesc: "Devices currently signed in to your account — up to 3 at a time. Remove one to free up a slot for a new device.",
    thisDevice: "This device",
    lastActive: "Last active",
    remove: "Remove",
    slots: "{n} of 3 devices in use",
    sessions: "Sessions",
    sessionsDesc: "Signed in somewhere you don't recognize, or just used a shared computer? Sign out of every other session while keeping this one active.",
    signOutOthers: "Sign out other sessions",
    signedOut: "Done — every other session has been signed out.",
    twoFactor: "Two-factor authentication",
    enabled: "Enabled",
    reset: "Reset device",
    resetTitle: "Reset two-factor authentication?",
    resetBody: "This removes your current authenticator and immediately sends you to set up a new one — do this if you're switching devices or lost access to your authenticator app.",
    resetConfirm: "Reset",
    cancel: "Cancel",
    resetPractice: "Practice only: nothing was reset.",
    notifications: "Notifications",
    enable: "Enable notifications",
    turnOff: "Turn off notifications",
    notifNote: "This is per browser or device, not per account.",
    newHint: "Use the cards from the top. Everything here is practice.",
  },
  ar: {
    title: "الإعدادات",
    subtitle: "إدارة تفضيلاتك وحسابك.",
    theme: "المظهر",
    light: "فاتح",
    dark: "داكن",
    themeNote: "للتدريب فقط: هذا لا يغيّر مظهر التطبيق الحقيقي.",
    language: "اللغة",
    langNote: "في التطبيق الحقيقي، يؤدي اختيار لغة إلى إعادة تحميل الصفحة بتلك اللغة.",
    changePassword: "تغيير كلمة المرور",
    current: "كلمة المرور الحالية",
    next: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور الجديدة",
    save: "حفظ",
    show: "إظهار كلمة المرور",
    hide: "إخفاء كلمة المرور",
    needCurrent: "أدخل كلمة المرور الحالية.",
    tooShort: "يجب ألا تقل كلمة المرور عن {n} حرفًا.",
    common: "كلمة المرور هذه شائعة جدًا — اختر كلمة يصعب تخمينها.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    updated: "تم تحديث كلمة المرور الخاصة بك.",
    anyCurrent: "للتدريب فقط: تقبل هنا أي كلمة مرور حالية، ولا يُحفظ شيء.",
    passkeyTitle: "تسجيل الدخول ببصمة الوجه / الإصبع",
    passkeyDesc: "أضف بصمة الوجه أو الإصبع أو Windows Hello لهذا الجهاز لتسجيل دخول أسرع — لن تحتاج لكلمة مرور على هذا الجهاز بعد الآن.",
    passkeySetUp: "إعداد تسجيل الدخول البيومتري",
    passkeyDone: "تم إعداد تسجيل الدخول البيومتري على هذا الجهاز.",
    passkeyNone: "لم يتم إعداد تسجيل الدخول البيومتري بعد.",
    devices: "الأجهزة",
    devicesDesc: "الأجهزة المسجلة دخولها حاليًا إلى حسابك — 3 كحد أقصى في وقت واحد. أزل جهازًا لإتاحة مساحة لجهاز جديد.",
    thisDevice: "هذا الجهاز",
    lastActive: "آخر نشاط",
    remove: "إزالة",
    slots: "{n} من 3 أجهزة قيد الاستخدام",
    sessions: "الجلسات",
    sessionsDesc: "سجّلت الدخول من مكان لا تتعرف عليه، أو استخدمت جهازًا مشتركًا؟ سجّل الخروج من كل الجلسات الأخرى مع إبقاء هذه الجلسة نشطة.",
    signOutOthers: "تسجيل الخروج من الجلسات الأخرى",
    signedOut: "تم — تم تسجيل الخروج من كل الجلسات الأخرى.",
    twoFactor: "المصادقة الثنائية",
    enabled: "مفعّلة",
    reset: "إعادة تعيين الجهاز",
    resetTitle: "إعادة تعيين المصادقة الثنائية؟",
    resetBody: "سيؤدي هذا إلى إزالة تطبيق المصادقة الحالي وإرسالك فورًا لإعداد واحد جديد — افعل هذا إذا كنت تُغيّر جهازك أو فقدت الوصول إلى تطبيق المصادقة.",
    resetConfirm: "إعادة تعيين",
    cancel: "إلغاء",
    resetPractice: "للتدريب فقط: لم تتم إعادة تعيين شيء.",
    notifications: "الإشعارات",
    enable: "تفعيل الإشعارات",
    turnOff: "إيقاف الإشعارات",
    notifNote: "هذا الإعداد لكل متصفح أو جهاز، وليس لكل حساب.",
    newHint: "استخدم البطاقات من الأعلى. كل ما هنا للتدريب.",
  },
} as const;

const DEVICES: { id: string; label: L; when: L; me?: boolean }[] = [
  { id: "d1", label: { en: "Chrome on Windows", ar: "كروم على ويندوز" }, when: { en: "Today", ar: "اليوم" }, me: true },
  { id: "d2", label: { en: "Safari on iPhone", ar: "سفاري على آيفون" }, when: { en: "Yesterday", ar: "أمس" } },
  { id: "d3", label: { en: "Chrome on Android", ar: "كروم على أندرويد" }, when: { en: "3 days ago", ar: "قبل 3 أيام" } },
];

export default function SettingsPractice({ role, locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const minLength = role === "admin" ? 15 : 12;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<"en" | "ar">(locale);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [passkey, setPasskey] = useState(false);
  const [devices, setDevices] = useState(DEVICES);
  const [signedOut, setSignedOut] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [push, setPush] = useState(false);

  function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cur = String(f.get("practice-current") ?? "");
    const pw = String(f.get("practice-password") ?? "");
    const conf = String(f.get("practice-confirm") ?? "");
    setSaved(false);
    if (!cur) return setError(ui.needCurrent);
    if (pw.length < minLength) return setError(ui.tooShort.replace("{n}", String(minLength)));
    if (/password|12345678|qwerty/i.test(pw)) return setError(ui.common);
    if (pw !== conf) return setError(ui.mismatch);
    setError(null);
    setSaved(true);
    form.reset();
    completeTask("password");
  }

  const card = (title: string, children: React.ReactNode, key: string) => (
    <Card key={key}>
      <h4 className="mb-4 card-title">{title}</h4>
      {children}
    </Card>
  );

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.title} description={ui.subtitle}>
      {level === "new" && <p className="text-sm text-slate-600 dark:text-navy-200">{ui.newHint}</p>}

      {card(
        ui.theme,
        <div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-navy-700 dark:bg-navy-800/60">
            {(
              [
                ["light", ui.light, Sun],
                ["dark", ui.dark, Moon],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={theme === v}
                onClick={() => {
                  setTheme(v);
                  if (v === "dark") completeTask("theme");
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 ${
                  theme === v ? "bg-white text-navy-900 shadow-soft dark:bg-navy-950 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-navy-400 dark:hover:text-navy-200"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-navy-300">{ui.themeNote}</p>
        </div>,
        "theme",
      )}

      {card(
        ui.language,
        <div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["en", "English"],
                ["ar", "العربية"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={lang === v}
                onClick={() => setLang(v)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 ${
                  lang === v ? "border-navy-700 bg-navy-50 text-navy-900 dark:bg-navy-800 dark:text-white" : "border-slate-200 text-slate-700 dark:border-navy-700 dark:text-navy-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-navy-300">{ui.langNote}</p>
        </div>,
        "language",
      )}

      {card(
        ui.changePassword,
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          {saved && (
            <Alert tone="success">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" /> {ui.updated}
              </span>
            </Alert>
          )}
          <PasswordField label={ui.current} name="practice-current" autoComplete="off" showLabel={ui.show} hideLabel={ui.hide} />
          <PasswordField label={ui.next} name="practice-password" autoComplete="off" showLabel={ui.show} hideLabel={ui.hide} hint={ui.tooShort.replace("{n}", String(minLength))} />
          <PasswordField label={ui.confirm} name="practice-confirm" autoComplete="off" showLabel={ui.show} hideLabel={ui.hide} />
          <p className="text-xs text-slate-500 dark:text-navy-300">{ui.anyCurrent}</p>
          <Button type="submit">{ui.save}</Button>
        </form>,
        "password",
      )}

      {role === "teacher" &&
        card(
          ui.passkeyTitle,
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-navy-300">{ui.passkeyDesc}</p>
            <p className="text-sm text-slate-700 dark:text-navy-100">{passkey ? ui.passkeyDone : ui.passkeyNone}</p>
            {!passkey && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPasskey(true);
                  completeTask("passkey");
                }}
              >
                {ui.passkeySetUp}
              </Button>
            )}
          </div>,
          "passkey",
        )}

      <Card className="space-y-5">
        <div>
          <h4 className="mb-4 card-title">{ui.devices}</h4>
          <p className="mb-3 text-sm text-slate-500 dark:text-navy-400">{ui.devicesDesc}</p>
          <ul className="space-y-2.5">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-navy-700 dark:bg-navy-900">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                    <Laptop className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {pick(d.label, locale)}
                      {d.me && <span className="ms-2 text-xs font-normal text-slate-500 dark:text-navy-400">({ui.thisDevice})</span>}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-navy-500">
                      {ui.lastActive}: {pick(d.when, locale)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  aria-label={`${ui.remove}: ${pick(d.label, locale)}`}
                  onClick={() => {
                    setDevices((list) => list.filter((x) => x.id !== d.id));
                    completeTask("devices");
                  }}
                >
                  {ui.remove}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-navy-300" role="status" aria-live="polite">
            {ui.slots.replace("{n}", String(devices.length))}
          </p>
        </div>
        <div className="border-t border-slate-100 pt-5 dark:border-navy-800">
          <h4 className="mb-2 card-title">{ui.sessions}</h4>
          <p className="mb-3 text-sm text-slate-500 dark:text-navy-400">{ui.sessionsDesc}</p>
          <Button type="button" variant="secondary" onClick={() => setSignedOut(true)}>
            {ui.signOutOthers}
          </Button>
          <div role="status" aria-live="polite">
            {signedOut && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" aria-hidden="true" /> {ui.signedOut}
              </p>
            )}
          </div>
        </div>
      </Card>

      {role === "admin" &&
        card(
          ui.twoFactor,
          <div className="space-y-3">
            <p className="text-sm text-slate-700 dark:text-navy-100">{ui.enabled}</p>
            {!resetOpen && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setResetOpen(true);
                  setResetDone(false);
                  completeTask("twofactor");
                }}
              >
                {ui.reset}
              </Button>
            )}
            {resetOpen && (
              <div role="group" aria-label={ui.resetTitle} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-medium">{ui.resetTitle}</p>
                <p>{ui.resetBody}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>
                    {ui.cancel}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setResetOpen(false);
                      setResetDone(true);
                    }}
                  >
                    {ui.resetConfirm}
                  </Button>
                </div>
              </div>
            )}
            <div role="status" aria-live="polite">
              {resetDone && <p className="text-xs text-slate-500 dark:text-navy-300">{ui.resetPractice}</p>}
            </div>
          </div>,
          "2fa",
        )}

      {card(
        ui.notifications,
        <div className="space-y-2">
          <Button
            type="button"
            variant={push ? "secondary" : "primary"}
            onClick={() => {
              const next = !push;
              setPush(next);
              if (next) completeTask("notifications");
            }}
          >
            {push ? ui.turnOff : ui.enable}
          </Button>
          <p className="text-xs text-slate-500 dark:text-navy-300">{ui.notifNote}</p>
        </div>,
        "notifications",
      )}
    </PracticeFrame>
  );
}
