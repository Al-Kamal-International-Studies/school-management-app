"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { Topbar } from "@/components/nav/Topbar";
import { PageTransition } from "@/components/nav/PageTransition";
import { TourProvider } from "@/lib/tour/TourProvider";
import { TourOverlay } from "@/components/tour/TourOverlay";
import type { Center, Notification, Profile } from "@/lib/types/database.types";
import type { ReactNode } from "react";

export function DashboardShell({
  profile,
  centers,
  activeCenterId,
  centerCode,
  notifications,
  children,
}: {
  profile: Profile;
  centers: Center[];
  activeCenterId: string;
  notifications: Notification[];
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
    <TourProvider profile={profile} activeCenterId={activeCenterId} onNavStepChange={setMobileOpen}>
      {/* `display: contents` — a real DOM node (so `data-center` and the CSS
          custom properties it switches actually reach both children below,
          including TourOverlay which renders as a sibling of the shell div,
          not a descendant) that generates no box of its own, so it can't
          affect the flex/fixed-positioning layout underneath it. CSS custom
          property inheritance follows the DOM tree, not the box tree, so
          `display: contents` doesn't block it. */}
      <div data-center={centerCode} className="contents">
        <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">
          <Sidebar role={profile.role} activeCenterId={activeCenterId} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              profile={profile}
              centers={centers}
              activeCenterId={activeCenterId}
              notifications={notifications}
              onMenuClick={() => setMobileOpen(true)}
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <TourOverlay />
      </div>
    </TourProvider>
  );
}
