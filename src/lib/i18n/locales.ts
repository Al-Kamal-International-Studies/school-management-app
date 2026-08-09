// Supported app languages. Not URL-based routing (see AGENTS.md guidance —
// nesting every route under app/[lang] would mean moving all existing
// routes); instead the active locale lives in a cookie + React context
// (see LocaleProvider.tsx) and is read server-side in the root layout to
// set <html lang dir> with no flash.

export type Locale = "en" | "ar";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: Locale[] = ["en", "ar"];

export interface LocaleInfo {
  code: Locale;
  label: string;
  nativeLabel: string;
  flag: string; // Unicode flag emoji, used as the primary language indicator
  dir: "ltr" | "rtl";
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧", dir: "ltr" },
  ar: { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇦🇪", dir: "rtl" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as string[]).includes(value);
}

export function dirForLocale(locale: Locale): "ltr" | "rtl" {
  return LOCALE_INFO[locale].dir;
}
