"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Chip } from "./parts";
import { lessonTexts } from "@/lib/onboarding/registry";
import type { FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import type { FocusTag, LessonDef, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Side sheet listing every lesson so people can jump around. A modal dialog:
 * focus moves in, Tab stays inside, Escape closes, focus returns to the
 * button that opened it.
 */
export function LessonDrawer({
  lessons,
  currentId,
  completed,
  focus,
  role,
  locale,
  dir,
  t,
  onSelect,
  onClose,
}: {
  lessons: LessonDef[];
  currentId: string | null;
  completed: ReadonlySet<string>;
  focus: readonly FocusTag[];
  role: UserRole;
  locale: OnboardingLocale;
  dir: "ltr" | "rtl";
  t: FrameworkStrings;
  onSelect: (lessonId: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" dir={dir} lang={locale}>
      <div className="absolute inset-0 animate-fade-in bg-navy-950/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-drawer-title"
        className="absolute inset-y-0 end-0 flex w-full max-w-sm animate-fade-in flex-col border-s border-slate-200 bg-white shadow-overlay dark:border-navy-800 dark:bg-navy-900"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-navy-800">
          <h2 id="onb-drawer-title" className="section-title">
            {t.lesson.drawerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-200 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-navy-800">
          {lessons.map((l, i) => {
            const title = lessonTexts(l, role)[locale].title;
            const done = completed.has(l.id);
            const current = l.id === currentId;
            const isFocus = l.focusTags.some((tag) => focus.includes(tag));
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-500 dark:hover:bg-white/[0.03]",
                    current && "bg-slate-50 dark:bg-white/[0.04]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular",
                      done
                        ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                        : "border-slate-300 text-slate-500 dark:border-navy-600 dark:text-navy-300",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-white">
                    {title}
                    {done && <span className="sr-only"> ({t.lesson.done})</span>}
                  </span>
                  {isFocus && <Chip tone="navy">{t.lesson.yourFocusShort}</Chip>}
                  {current && <span className="text-xs text-slate-500 dark:text-navy-300">{t.lesson.current}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
