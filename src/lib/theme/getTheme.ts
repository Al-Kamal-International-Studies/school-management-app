import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "./theme";

/** Reads the active theme from the THEME cookie. Server-only. */
export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
