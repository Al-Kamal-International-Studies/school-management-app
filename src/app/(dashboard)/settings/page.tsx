import { Phone, Mail } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { FadeUp } from "@/components/motion/FadeUp";
import { Card } from "@/components/ui/Card";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { ThemeSwitch } from "@/components/settings/ThemeSwitch";
import { LanguageCards } from "@/components/i18n/LanguageCards";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { PushNotificationToggle } from "@/components/settings/PushNotificationToggle";
import { MfaSettingsCard } from "@/components/mfa/MfaSettingsCard";
import { SignOutOtherSessionsButton } from "@/components/settings/SignOutOtherSessionsButton";
import { DeviceList } from "@/components/settings/DeviceList";
import { BiometricSettingsCard } from "@/components/settings/BiometricSettingsCard";

const CONTACT_PHONE = "052 772 7246";
const CONTACT_EMAIL = "info@alkamalinternational.com";

export default async function SettingsPage() {
  const me = await requireRole("admin", "teacher", "student", "parent");
  const dict = await getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.settings.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.settings.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.theme}</h2>
          <ThemeSwitch />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.language}</h2>
          <LanguageCards redirectTo="/settings" />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.changePassword}</h2>
          <ChangePasswordForm minLength={me.role === "admin" ? 15 : 12} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.155}>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-navy-900 dark:text-white">{dict.biometrics.settingsTitle}</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-navy-400">{dict.biometrics.settingsDescription}</p>
          <BiometricSettingsCard />
        </Card>
      </FadeUp>

      <FadeUp delay={0.16}>
        <Card className="space-y-5">
          <div>
            <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.devices.settingsTitle}</h2>
            <DeviceList />
          </div>
          <div className="border-t border-slate-100 pt-5 dark:border-navy-800">
            <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.sessions}</h2>
            <SignOutOtherSessionsButton />
          </div>
        </Card>
      </FadeUp>

      {me.role === "admin" && (
        <FadeUp delay={0.17}>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.twoFactorAuth}</h2>
            <MfaSettingsCard />
          </Card>
        </FadeUp>
      )}

      <FadeUp delay={0.18}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.notifications}</h2>
          <PushNotificationToggle />
        </Card>
      </FadeUp>

      <FadeUp delay={0.2}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.settings.contactUs}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                <Phone className="h-4 w-4" />
              </span>
              <div>
                <dt className="text-xs text-slate-500 dark:text-navy-400">{dict.settings.phone}</dt>
                <dd>
                  <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`} className="font-medium text-navy-900 hover:text-navy-700 dark:text-white dark:hover:text-navy-200">
                    {CONTACT_PHONE}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <dt className="text-xs text-slate-500 dark:text-navy-400">{dict.settings.email}</dt>
                <dd>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-navy-900 hover:text-navy-700 dark:text-white dark:hover:text-navy-200">
                    {CONTACT_EMAIL}
                  </a>
                </dd>
              </div>
            </div>
          </dl>
        </Card>
      </FadeUp>
    </div>
  );
}
