"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { THEME_COOKIE, type Theme } from "./theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Makes the server-resolved theme available to Client Components and lets
 * them change it instantly (toggling the `dark` class Tailwind's
 * darkMode:"class" config looks for) without a full page reload — unlike
 * locale, a theme swap doesn't need a fresh server render, it's a pure CSS
 * concern. The choice is also written back to the THEME cookie so the next
 * server render (e.g. after a real navigation) starts in the right theme
 * with no flash.
 */
export function ThemeProvider({ theme: initialTheme, children }: { theme: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
