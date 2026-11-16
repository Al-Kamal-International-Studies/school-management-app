import { notFound } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isLocale } from "@/lib/i18n/locales";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { UserRole } from "@/lib/types/database.types";

const ROLES: UserRole[] = ["admin", "teacher", "student", "parent"];

/**
 * Development-only preview of the onboarding flow with a fake profile, so it
 * can be checked without signing in:
 *   /dev/onboarding-preview?role=teacher&locale=ar&overseer=1&seen=10
 * `seen=N` pretends the account finished onboarding version N (what's new).
 * Returns 404 everywhere except `next dev`; src/proxy.ts only skips the
 * sign-in redirect for this path in development too. Nothing here is saved
 * to the server (the flow's `preview` prop turns that off).
 */
export default async function OnboardingPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  const roleParam = one("role");
  const role = ROLES.find((r) => r === roleParam) ?? "teacher";
  const localeParam = one("locale");
  const locale = isLocale(localeParam) ? localeParam : await getLocale();
  const dict = await getDictionary(locale);
  const seen = Number(one("seen"));

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <OnboardingFlow
        preview
        userId={`preview-${role}`}
        role={role}
        canOverseeChats={role === "admin" && one("overseer") === "1"}
        hasSeenTour={Number.isFinite(seen) && seen > 0}
        tourVersionSeen={Number.isFinite(seen) && seen > 0 ? seen : 1}
      />
    </LocaleProvider>
  );
}
