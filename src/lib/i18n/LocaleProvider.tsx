"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./locales";
import type { Dictionary } from "./types";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Makes the server-resolved locale + dictionary available to Client
 * Components. The root layout resolves both from the NEXT_LOCALE cookie
 * (see getLocale.ts/getDictionary.ts) and passes them in here — no client
 * fetch or flash of the wrong language.
 */
export function LocaleProvider({ locale, dict, children }: LocaleContextValue & { children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
