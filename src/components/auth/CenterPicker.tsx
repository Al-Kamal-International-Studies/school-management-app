"use client";

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
 * Uses the existing animate-fade-in-up CSS keyframe utility, not a
 * JS-mount-gated Framer Motion animation — see AuthShell.tsx's own comment
 * for why that matters on this exact screen.
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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-400">
        {dict.centerPicker.label}
      </p>
      <div role="radiogroup" aria-label={dict.centerPicker.label} className="grid grid-cols-2 gap-2">
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
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start transition-colors",
                active
                  ? "border-navy-600 bg-navy-50 dark:border-gold-400 dark:bg-navy-800/60"
                  : "border-slate-200 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800/40"
              )}
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-navy-900">
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
                    "block truncate text-sm font-semibold",
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
