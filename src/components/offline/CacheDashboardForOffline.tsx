"use client";

import { useEffect } from "react";
import { writeOfflineCache } from "@/lib/offline/offlineCache";
import type { DashboardOfflineSummary } from "@/lib/offline/types";

/**
 * Renders nothing — writes `summary` (already RLS-scoped data a Server
 * Component fetched for THIS request, see offlineCache.ts's own doc
 * comment) to the offline cache on mount/whenever it changes, so
 * app/offline/page.tsx has something real to show if this same user opens
 * the app later with no connection. Drop this into any dashboard page
 * alongside its normal server-rendered content — see (dashboard)/parent/
 * page.tsx for the first one wired up. `role` doubles as the cache key
 * (`dashboard:<role>`) — this matches exactly what app/offline/page.tsx
 * looks up via readLastKnownUser()'s own `role` field, so the two stay in
 * sync without a separate key needing to be threaded through both places.
 */
export function CacheDashboardForOffline({
  userId,
  role,
  summary,
}: {
  userId: string;
  role: string;
  summary: DashboardOfflineSummary;
}) {
  useEffect(() => {
    writeOfflineCache(`dashboard:${role}`, userId, role, summary);
    // Stringifying is intentional — `summary` is a fresh object identity on
    // every server render even when its contents haven't actually changed,
    // and re-writing localStorage on every render would be wasteful (if
    // harmless). Comparing serialized content instead keeps this an actual
    // no-op when nothing real changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role, JSON.stringify(summary)]);

  return null;
}
