"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, ArrowRight } from "lucide-react";
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
 *
 * Visual language (2026-08-16 redesign, "make the dropdowns attractive"):
 * trigger is now a bordered chip that raises on hover/open (matching Card's
 * shadow-card/shadow-card-hover language); the open panel is a rounded-2xl
 * card with the active center summarized up top (informational only — no
 * new interaction) and each switchable option as its own hoverable row with
 * a reveal-on-hover arrow. Underlying behavior — what's clickable, the
 * `others` filtering, the cookie write + reload — is unchanged from before
 * this pass.
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
        className={cn(
          "flex items-center gap-1.5 rounded-full border py-1 ps-1 pe-2.5 shadow-soft transition-all duration-200 sm:pe-3",
          open
            ? "border-gold-400 bg-white shadow-card ring-2 ring-gold-400/25 dark:bg-navy-800"
            : "border-slate-200/70 bg-white/70 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card dark:border-navy-700 dark:bg-navy-900/50 dark:hover:border-navy-500"
        )}
      >
        <CenterBadge shortCode={active.short_code} />
        <span className="hidden text-sm font-medium text-slate-700 dark:text-navy-100 sm:inline">{active.short_code}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in-up absolute end-0 z-20 mt-2 w-64 origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card-hover dark:border-navy-700 dark:bg-navy-900"
        >
          {/* Currently-active center — informational only, not a button;
              gives the menu a clear "you are here" anchor before the
              switchable list below. */}
          <div className="flex items-center gap-2.5 rounded-xl bg-navy-50/70 px-2.5 py-2.5 dark:bg-navy-800/50">
            <CenterBadge shortCode={active.short_code} ring="gold" />
            <span className="min-w-0 flex-1" dir="ltr">
              <span className="block truncate text-sm font-semibold text-navy-900 dark:text-white">{active.name}</span>
              <span className="block text-xs text-slate-500 dark:text-navy-400">{active.short_code}</span>
            </span>
            <Check className="h-4 w-4 shrink-0 text-gold-500 dark:text-gold-400" strokeWidth={2.5} />
          </div>

          <p className="px-2.5 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-400">
            {dict.centerSwitcher.switchTo}
          </p>
          <div className="space-y-0.5">
            {others.map((center) => (
              <button
                key={center.id}
                type="button"
                role="menuitem"
                onClick={() => switchTo(center.id)}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-start transition-colors duration-150 hover:bg-navy-50 dark:hover:bg-navy-800/60"
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
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-navy-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CenterBadge({ shortCode, ring = "white" }: { shortCode: string; ring?: "white" | "gold" }) {
  const logo = centerLogoSrc(shortCode);
  return (
    <span
      className={cn(
        "relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2",
        ring === "gold" ? "ring-gold-300 dark:ring-gold-500/50" : "ring-white dark:ring-navy-800"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.light} alt="" className="h-full w-full object-cover dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.dark} alt="" className="hidden h-full w-full object-cover dark:block" />
    </span>
  );
}
