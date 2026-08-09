"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { LOCALES, LOCALE_INFO } from "@/lib/i18n/locales";
import { setLocaleCookie } from "@/lib/i18n/setLocaleCookie";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Two large flag cards for choosing English / العربية. Used both on the
 * mandatory first-launch screen and again in Settings. Selecting a language
 * persists it (NEXT_LOCALE cookie) and does a full navigation to
 * `redirectTo` — a real page load, not client-side routing, is required so
 * the root layout's Server Component re-reads the cookie and re-renders
 * <html lang dir> for the new language/direction with no mismatch.
 */
export function LanguageCards({ redirectTo }: { redirectTo: string }) {
  const { locale } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {LOCALES.map((code) => {
        const info = LOCALE_INFO[code];
        const active = locale === code;
        return (
          <motion.button
            key={code}
            type="button"
            onClick={() => {
              setLocaleCookie(code);
              window.location.href = redirectTo;
            }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-white/95 px-6 py-8 text-center shadow-card transition-colors dark:bg-navy-900/80",
              active
                ? "border-gold-400 ring-2 ring-gold-400/40"
                : "border-transparent hover:border-navy-200 dark:hover:border-navy-600"
            )}
          >
            {active && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold-gradient text-navy-900">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <span className="text-5xl leading-none" aria-hidden="true">
              {info.flag}
            </span>
            <span className="font-display text-lg font-semibold text-navy-900 dark:text-white">{info.nativeLabel}</span>
            {info.nativeLabel !== info.label && (
              <span className="text-xs text-slate-500 dark:text-navy-300">{info.label}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
