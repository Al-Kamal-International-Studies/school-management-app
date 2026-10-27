"use client";

import { Check } from "lucide-react";
import { LOCALES, LOCALE_INFO } from "@/lib/i18n/locales";
import { setLocaleCookie } from "@/lib/i18n/setLocaleCookie";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Two language cards for choosing English / العربية. Used both on the
 * mandatory first-launch screen and again in Settings. Selecting a language
 * persists it (NEXT_LOCALE cookie) and does a full navigation to
 * `redirectTo` — a real page load, not client-side routing, is required so
 * the root layout's Server Component re-reads the cookie and re-renders
 * <html lang dir> for the new language/direction with no mismatch.
 */
export function LanguageCards({ redirectTo }: { redirectTo: string }) {
  const { locale } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {LOCALES.map((code) => {
        const info = LOCALE_INFO[code];
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              setLocaleCookie(code);
              window.location.href = redirectTo;
            }}
            aria-pressed={active}
            className={cn(
              "relative flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border bg-white px-6 py-7 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 active:translate-y-px dark:bg-navy-900",
              active
                ? "border-navy-900 shadow-[inset_0_0_0_1px_rgb(var(--color-navy-900))] dark:border-navy-200 dark:shadow-[inset_0_0_0_1px_rgb(var(--color-navy-200))]"
                : "border-slate-200 hover:border-slate-300 dark:border-navy-700 dark:hover:border-navy-500"
            )}
          >
            {active && (
              <span className="absolute end-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-950">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <span className="font-display text-xl font-semibold text-navy-950 dark:text-white">{info.nativeLabel}</span>
            {info.nativeLabel !== info.label && (
              <span className="text-xs text-slate-500 dark:text-navy-300">{info.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
