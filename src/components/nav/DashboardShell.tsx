"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { Topbar } from "@/components/nav/Topbar";
import { PageTransition } from "@/components/nav/PageTransition";
import { TourProvider } from "@/lib/tour/TourProvider";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Center, Notification, Profile } from "@/lib/types/database.types";
import type { ReactNode } from "react";

export function DashboardShell({
  profile,
  centers,
  activeCenterId,
  centerCode,
  notifications,
  hasAutismAccess,
  children,
}: {
  profile: Profile;
  centers: Center[];
  activeCenterId: string;
  notifications: Notification[];
  /** Parent-only gate on top of the existing AKET center check — see
   * lib/autism/hasAutismAccess.ts. Always true for non-parent roles. */
  hasAutismAccess: boolean;
  /** "akis" | "aket" — resolved server-side in (dashboard)/layout.tsx from
   *  the same validated activeCenterId, never a raw cookie read. Sets the
   *  `data-center` attribute that globals.css keys the whole navy/gold
   *  CSS-variable palette off of. Baked into the initial server-rendered
   *  HTML (this component is rendered server-side first, "use client" only
   *  governs hydration/interactivity afterwards) — same no-flash guarantee
   *  as the THEME cookie's `dark` class on <html>, just scoped to the
   *  authenticated shell instead of the whole document, since that's the
   *  only place this app's chrome actually needs it. */
  centerCode: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { dict } = useLocale();

  // Close the mobile drawer whenever the route changes. Adjusting state
  // during render (rather than in a useEffect) is the pattern React
  // recommends for "reset state when a prop changes" — see
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <TourProvider profile={profile} activeCenterId={activeCenterId} hasAutismAccess={hasAutismAccess} onNavStepChange={setMobileOpen}>
      {/* `display: contents` — a real DOM node (so `data-center` and the CSS
          custom properties it switches actually reach both children below,
          including TourOverlay which renders as a sibling of the shell div,
          not a descendant) that generates no box of its own, so it can't
          affect the flex/fixed-positioning layout underneath it. CSS custom
          property inheritance follows the DOM tree, not the box tree, so
          `display: contents` doesn't block it. */}
      <div data-center={centerCode} className="contents">
        {/* Visually hidden until focused — lets a keyboard user jump past the
            full sidebar nav (14-20 items on every role) straight to the
            page's actual content, instead of tabbing through it on every
            single page load. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-navy-900 focus:shadow-overlay focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 dark:focus:bg-navy-900 dark:focus:text-white dark:focus-visible:ring-navy-300"
        >
          {dict.common.skipToContent}
        </a>
        <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">
          <Sidebar
            role={profile.role}
            activeCenterId={activeCenterId}
            hasAutismAccess={hasAutismAccess}
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              profile={profile}
              centers={centers}
              activeCenterId={activeCenterId}
              notifications={notifications}
              onMenuClick={() => setMobileOpen(true)}
            />
            {/* One content column, capped at 1280px so tables and stat rows keep
                sane proportions on wide monitors. 16px gutter on phones
                (DESIGN.md), stepping up to 24/32px; the bottom padding is a
                little larger than the top so long pages don’t end hard against
                the viewport edge. */}
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 pb-12 pt-6 focus:outline-none sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
              <div className="mx-auto w-full max-w-7xl">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
        <TourOverlay />
      </div>
    </TourProvider>
  );
}
