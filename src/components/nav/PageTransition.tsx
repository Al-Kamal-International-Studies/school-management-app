"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The entrance transition for the dashboard's main content area —
 * DashboardShell.tsx wraps every authenticated page in the app (admin,
 * teacher, student, parent, settings, everything) with this, so it's the
 * highest-blast-radius instance of a bug found this pass: this used to be
 * Framer Motion's AnimatePresence + a `motion.div` fading in from
 * opacity:0 on mount (with an exit fade for the outgoing page). That
 * depended on a post-hydration JS effect actually completing, and in real
 * testing it was found stuck at its initial (invisible) state — since
 * this component sits between every route and the user, that meant a
 * logged-in user could navigate to a page and see nothing at all, not
 * just a login screen.
 *
 * Replaced with a plain CSS keyframe (`animate-fade-in-up`, defined in
 * tailwind.config.ts) applied to a `key={pathname}`-remounted div: the
 * `key` change still gives React a fresh DOM node per route (so the
 * fade-up still replays on every navigation, same as before), but the
 * animation itself now runs on the compositor timeline with no JS
 * completion dependency — before it "starts" and after it "finishes" are
 * both just this element's normal, fully-opaque CSS. There's no longer a
 * code path that leaves a page permanently invisible.
 *
 * The one thing given up is the *outgoing* page's fade-out
 * (AnimatePresence's `exit`, plus its `mode="wait"` sequencing). That was
 * a cosmetic nicety on the way out of a page; it's not something users
 * depend on to actually see the page they navigated to, which is the
 * property that matters here.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
