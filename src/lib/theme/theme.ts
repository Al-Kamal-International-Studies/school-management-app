export type Theme = "light" | "dark";

export const THEME_COOKIE = "THEME";

export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark";
}
