"use client";

import { Compass } from "lucide-react";
import { useTour } from "@/lib/tour/TourProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * "Take the tour again" — Settings' manual replay entry point (the
 * auto-trigger in TourProvider only ever fires once per account, per the
 * has_seen_tour flag). Reads the same TourProvider context DashboardShell
 * mounts higher up the tree; works from Settings (a Server Component)
 * because React context flows through intervening Server Components down
 * to this Client Component, the same way useLocale()/useTheme() already do
 * elsewhere in this app.
 */
export function ReplayTourButton() {
  const { startTour } = useTour();
  const { dict } = useLocale();

  return (
    <button type="button" onClick={startTour} className="btn-secondary w-full sm:w-auto">
      <Compass className="h-4 w-4" />
      {dict.tour.replayButton}
    </button>
  );
}
