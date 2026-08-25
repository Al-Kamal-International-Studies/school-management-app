"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { TOUR_STEPS, CURRENT_TOUR_VERSION, type TourStep } from "./steps";
import { markTourSeenAction } from "./actions";
import type { Profile } from "@/lib/types/database.types";

interface TourContextValue {
  isOpen: boolean;
  stepIndex: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  backStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Read from anywhere inside DashboardShell's tree (e.g. the Tutorial button
 * in Sidebar.tsx) to control or inspect the tour. Works through intervening
 * Server Components the same way useLocale()/useTheme() already do in this
 * app — see LocaleProvider/ThemeProvider. */
export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

/**
 * Owns the guided tour's open/step state for the whole authenticated app.
 * Mounted once by DashboardShell, which by construction only ever renders
 * after every first-login gate (must-change-password, device cap, admin
 * MFA — see requireRole() in src/lib/auth.ts) has already redirected away
 * anyone who hasn't cleared them, whether the gate lives in a role layout
 * (admin/teacher/student/parent/layout.tsx) or directly in a shared page
 * (settings, messages, calendar, documents...). Next.js never streams a
 * partial response here (no loading.tsx/Suspense boundary sits between
 * DashboardShell and any of those redirect() calls), so a redirect from a
 * gate further down the tree aborts the whole response instead of letting
 * this component's markup reach the browser first — the same mechanism
 * those existing gates already depend on in production. That's what makes
 * it safe to trigger the tour here, from `profile.has_seen_tour`, rather
 * than re-deriving it separately in every route.
 *
 * `onNavStepChange` lets the tour ask DashboardShell to open/close the
 * mobile sidebar drawer while a nav-item step is active — on desktop the
 * sidebar is always visible regardless (Sidebar.tsx's `lg:!transform-none`),
 * so this is a no-op there.
 *
 * `steps` is state, not a plain derivation of `profile.role` — it needs to
 * hold two different lists depending on how the tour was triggered (see
 * `startTour` vs. the auto-trigger effect below), which is what actually
 * makes the "what's new" mechanism work: a manual replay (the sidebar's
 * Tutorial button) always shows the complete, current step list for the
 * role, while an automatic trigger for an account that's behind on
 * `tour_version_seen` (0032_tour_versioning_and_notifications.sql) shows
 * only the step(s) newer than what they've already seen.
 */
export function TourProvider({
  profile,
  activeCenterId,
  hasAutismAccess,
  onNavStepChange,
  children,
}: {
  profile: Profile;
  /** The account's current active center (same value DashboardShell already
   * threads to Sidebar/Topbar) — used to drop any step whose
   * `centerRestricted` doesn't match, so an AKIS-only account is never
   * shown a step pointing at a nav item or page section it doesn't have
   * (currently just the Autism Section steps; see steps.ts). */
  activeCenterId: string;
  /** Same signal Sidebar.tsx uses to hide the parent Autism Section nav
   * item — drops the matching `autismGated` tour step too, so the tour
   * never tries to spotlight a page section that isn't there. Always true
   * for non-parent roles. */
  hasAutismAccess: boolean;
  onNavStepChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const fullSteps = TOUR_STEPS[profile.role].filter(
    (s) => (!s.centerRestricted || s.centerRestricted === activeCenterId) && (!s.autismGated || hasAutismAccess)
  );
  const [steps, setSteps] = useState<TourStep[]>(fullSteps);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [, startTransition] = useTransition();
  const hasAutoTriggered = useRef(false);

  // Auto-trigger exactly once per mount, for an account that hasn't fully
  // caught up on the tour yet. A ref (not state) guards this so a later
  // has_seen_tour/tour_version_seen flip from replaying elsewhere never
  // re-fires it. The setState calls are deferred via queueMicrotask — same
  // fix as HANDOVER.md Part 2 §17.2 ("Calling setState synchronously
  // within an effect can trigger cascading renders", a React 19 /
  // eslint-config-next 16 lint rule) — behavior is unchanged, just no
  // longer synchronous.
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;

    if (!profile.has_seen_tour) {
      // First-ever login: the complete tour for this role.
      queueMicrotask(() => {
        setSteps(fullSteps);
        setStepIndex(0);
        setIsOpen(true);
      });
      return;
    }

    if (profile.tour_version_seen < CURRENT_TOUR_VERSION) {
      // Returning account, behind on the tour: show only what's new to
      // them (a feature shipped after they last finished/skipped it), not
      // the whole thing again. If nothing in their role's step list is
      // actually newer than what they've seen (e.g. every version bump
      // since only touched other roles), there's nothing to show — no
      // popup fires, same as a fully caught-up account.
      const newSteps = fullSteps.filter((s) => s.version > profile.tour_version_seen);
      if (newSteps.length > 0) {
        queueMicrotask(() => {
          setSteps(newSteps);
          setStepIndex(0);
          setIsOpen(true);
        });
      }
    }
    // profile fields are read once, deliberately — see ref guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) {
      onNavStepChange(false);
      return;
    }
    onNavStepChange(steps[stepIndex]?.target.kind === "nav");
  }, [isOpen, stepIndex, steps, onNavStepChange]);

  function persistSeen() {
    startTransition(() => {
      void markTourSeenAction();
    });
  }

  function startTour() {
    // Manual replay (the sidebar's Tutorial button) is always the full
    // tour, regardless of what an auto-trigger might have shown — someone
    // asking to "take the tour again" wants the whole thing, not just
    // whatever's newest.
    setSteps(fullSteps);
    setStepIndex(0);
    setIsOpen(true);
  }

  function nextStep() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function backStep() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function closeAndMarkSeen() {
    setIsOpen(false);
    persistSeen();
  }

  return (
    <TourContext.Provider
      value={{
        isOpen,
        stepIndex,
        steps,
        startTour,
        nextStep,
        backStep,
        skipTour: closeAndMarkSeen,
        finishTour: closeAndMarkSeen,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
