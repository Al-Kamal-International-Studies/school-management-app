"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const { dict } = useLocale();

  const options = [
    { value: "light" as const, label: dict.settings.themeLight, icon: Sun },
    { value: "dark" as const, label: dict.settings.themeDark, icon: Moon },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-navy-700 dark:bg-navy-800/60">
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white text-navy-900 shadow-soft dark:bg-navy-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-navy-400 dark:hover:text-navy-200"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
