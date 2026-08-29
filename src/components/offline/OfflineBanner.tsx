"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/**
 * A thin, persistent, app-wide indicator whenever the browser reports no
 * connectivity — so a user on a normal (already-loaded) page always knows
 * they're looking at whatever was on screen before the connection dropped,
 * not live data, rather than finding out only if/when a navigation fails
 * and they land on /offline. Purely informational: never blocks
 * interaction with the page underneath it.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — showing previously loaded data.
    </div>
  );
}
