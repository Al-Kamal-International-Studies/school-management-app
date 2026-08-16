"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { centerLogoSrc } from "@/lib/centers/branding";
import { setActiveCenterCookie } from "@/lib/centers/setActiveCenterCookie";
import type { Center } from "@/lib/types/database.types";

/**
 * Top-right control to switch which center's data the app is scoped to.
 * Only ever rendered (by Topbar) when `centers.length > 1` — i.e. only for
 * accounts explicitly granted access to more than one center via
 * profile_center_access (0027_centers.sql). A single-center account (every
 * teacher/student/parent, and most admins) never sees this at all.
 *
 * Animation follows HANDOVER.md Part 4 §14: the open panel is a plain
 * conditionally-rendered element using the CSS keyframe utility
 * (`animate-fade-in-up`, tailwind.config.ts), not a JS-driven mount
 * animation (Framer Motion's `initial`/`animate`) — so there is no code path
 * where opening the menu can leave it stuck invisible. Closing is instant
 * (no exit animation), the same tradeoff already made for PageTransition.
 */
export function CenterSwitcher({ centers, activeCenterId }: { centers: Center[]; activeCenterId: string }) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Hooks above must run unconditionally; the guard comes after them.
  // Not a hook itself, so it's safe here.
  if (centers.length <= 1) return null;

  const active = centers.find((c) => c.id === activeCenterId) ?? centers[0];
  if (!active) return null;
  const others = centers.filter((c) => c.id !== active.id);

  function switchTo(centerId: string) {
    setActiveCenterCookie(centerId);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={dict.centerSwitcher.switchCenter}
        className="flex items-center gap-1.5 rounded-full py-1 ps-1 pe-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 sm:pe-2.5"
      >
        <CenterBadge shortCode={active.short_code} />
        <span className="hidden text-sm font-medium text-slate-700 dark:text-navy-100 sm:inline">{active.short_code}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in-up absolute end-0 z-20 mt-1.5 w-56 origin-top overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-card-hover dark:border-navy-700 dark:bg-navy-900"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-400">
            {dict.centerSwitcher.switchTo}
          </p>
          {others.map((center) => (
            <button
              key={center.id}
              type="button"
              role="menuitem"
              onClick={() => switchTo(center.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start transition-colors hover:bg-slate-50 dark:hover:bg-navy-800/60"
            >
              <CenterBadge shortCode={center.short_code} />
              {/* Institution names/short codes are Latin-script brand identifiers,
                  stored as-is regardless of locale (same as class/subject names
                  elsewhere in this app) — dir="ltr" keeps them left-to-right and
                  truncating from the correct (trailing) side even inside an
                  RTL-direction menu. */}
              <span className="min-w-0 flex-1" dir="ltr">
                <span className="block truncate text-sm font-medium text-navy-900 dark:text-white">{center.name}</span>
                <span className="block text-xs text-slate-500 dark:text-navy-400">{center.short_code}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CenterBadge({ shortCode }: { shortCode: string }) {
  const logo = centerLogoSrc(shortCode);
  return (
    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-navy-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.light} alt="" className="h-full w-full object-cover dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.dark} alt="" className="hidden h-full w-full object-cover dark:block" />
    </span>
  );
}
