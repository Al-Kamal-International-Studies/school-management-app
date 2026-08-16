"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { TOUR_STEPS, type TourStep } from "./steps";
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

/** Read from anywhere inside DashboardShell's tree (e.g. the "Take the tour
 * again" button in Settings) to control or inspect the tour. Works through
 * intervening Server Components the same way useLocale()/useTheme() already
 * do in this app — see LocaleProvider/ThemeProvider. */
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
 */
export function TourProvider({
  profile,
  onNavStepChange,
  children,
}: {
  profile: Profile;
  onNavStepChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const steps = TOUR_STEPS[profile.role];
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [, startTransition] = useTransition();
  const hasAutoTriggered = useRef(false);

  // Auto-trigger exactly once per mount, for an account that hasn't
  // finished/skipped the tour yet. A ref (not state) guards this so a
  // later has_seen_tour flip from replaying elsewhere never re-fires it.
  // The setState calls are deferred via queueMicrotask — same fix as
  // HANDOVER.md Part 2 §17.2 ("Calling setState synchronously within an
  // effect can trigger cascading renders", a React 19 / eslint-config-next
  // 16 lint rule) — behavior is unchanged, just no longer synchronous.
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    if (!profile.has_seen_tour) {
      queueMicrotask(() => {
        setStepIndex(0);
        setIsOpen(true);
      });
    }
    // profile.has_seen_tour is read once, deliberately — see ref guard above.
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
