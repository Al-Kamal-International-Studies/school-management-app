import "server-only";

import type { Locale } from "./locales";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  ar: () => import("./dictionaries/ar").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
