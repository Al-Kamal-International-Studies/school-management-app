import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/** Reads the active locale from the NEXT_LOCALE cookie. Server-only. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Whether the visitor has ever picked a language (used by proxy.ts to gate the mandatory first-launch screen). */
export async function hasChosenLocale(): Promise<boolean> {
  const cookieStore = await cookies();
  return isLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
