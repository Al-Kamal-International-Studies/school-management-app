"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { centerLogoSrc } from "@/lib/centers/branding";
import { setLoginCenterCookie } from "@/lib/centers/setLoginCenterCookie";
import { KNOWN_CENTER_LIST } from "@/lib/centers/knownCenters";

/**
 * The pre-login center picker — visible on /login for literally everyone,
 * unauthenticated, per Muhammad's request (see AGENTS-level task doc): this
 * is "which center am I trying to log into," a genuinely different question
 * from CenterSwitcher.tsx's post-login "which center's data am I viewing,"
 * and is never gated behind any account/role since nobody's signed in yet.
 *
 * Selecting a center persists it via setLoginCenterCookie (read back by
 * loginCenterCookie.ts, both for rendering AuthShell's branding and for
 * completeLogin.ts's actual access check) and then does a full page reload
 * — same pattern CenterSwitcher.tsx already uses for its own cookie change
 * — so the server-rendered branding panel, mobile logo, and page copy all
 * re-render for the new center in one consistent pass. A client-state-only
 * toggle was deliberately not used here: this needs to survive the actual
 * sign-in POST and page reloads per the task's own requirement, and a full
 * reload is the simplest way to guarantee that without introducing a new
 * client/server sync mechanism for what's otherwise a one-shot pre-auth
 * choice.
 *
 * Visual language (2026-08-16 redesign, "make the dropdowns attractive"):
 * card-style options matching this app's existing shadow-card/shadow-card-
 * hover + navy/gold premium conventions (see Card.tsx, LanguageCards.tsx)
 * instead of the earlier bare bordered-button treatment — a raised card,
 * gold ring + corner check badge for the active choice, subtle lift on
 * hover. Only CSS transitions/hover states, no mount-gated animation (the
 * outer wrapper keeps the same animate-fade-in-up entrance it always had).
 * Underlying behavior (radiogroup semantics, click handler, cookie + reload)
 * is unchanged from before this pass.
 */
export function CenterPicker({ selectedCenterId }: { selectedCenterId: string }) {
  const { dict } = useLocale();

  function choose(centerId: string) {
    if (centerId === selectedCenterId) return;
    setLoginCenterCookie(centerId);
    window.location.reload();
  }

  return (
    <div className="mb-6 animate-fade-in-up">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-400">
        {dict.centerPicker.label}
      </p>
      <div role="radiogroup" aria-label={dict.centerPicker.label} className="grid grid-cols-2 gap-3">
        {KNOWN_CENTER_LIST.map((center) => {
          const active = center.id === selectedCenterId;
          const logo = centerLogoSrc(center.short_code);
          return (
            <button
              key={center.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(center.id)}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-start shadow-soft transition-all duration-200",
                active
                  ? "border-gold-400 bg-white shadow-card ring-1 ring-gold-400/30 dark:bg-navy-800/70"
                  : "border-slate-200/80 bg-white/70 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card dark:border-navy-700 dark:bg-navy-900/40 dark:hover:border-navy-500"
              )}
            >
              {active && (
                <span className="absolute end-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold-gradient text-navy-900 shadow-gold">
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </span>
              )}
              <span
                className={cn(
                  "relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 transition-all duration-200",
                  active ? "ring-gold-300 dark:ring-gold-500/50" : "ring-white dark:ring-navy-900"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.light} alt="" className="h-full w-full object-cover dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.dark} alt="" className="hidden h-full w-full object-cover dark:block" />
              </span>
              {/* Institution short codes/names are Latin-script brand
                  identifiers, stored as-is regardless of locale — same
                  reasoning and dir="ltr" treatment CenterSwitcher.tsx
                  already uses for the identical content. */}
              <span className="min-w-0 flex-1" dir="ltr">
                <span
                  className={cn(
                    "block truncate text-sm font-semibold tracking-wide",
                    active ? "text-navy-900 dark:text-white" : "text-slate-600 dark:text-navy-300"
                  )}
                >
                  {center.short_code}
                </span>
                <span className="block truncate text-[11px] text-slate-400 dark:text-navy-500">{center.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
