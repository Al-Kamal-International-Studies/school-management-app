"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { readLastKnownUser, readOfflineCache, type OfflineEnvelope } from "@/lib/offline/offlineCache";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import type { DashboardOfflineSummary } from "@/lib/offline/types";

/**
 * All the actual interactive logic for /offline lives here, in a client
 * component — kept separate from page.tsx (a plain Server Component) so
 * page.tsx can carry the `export const dynamic = "force-static"` route
 * segment config, which route-segment config exports require a server
 * boundary for. See page.tsx's own doc comment for why that config matters.
 */
export function OfflineContent() {
  const [envelope, setEnvelope] = useState<OfflineEnvelope<DashboardOfflineSummary> | null>(null);
  const [checkedCache, setCheckedCache] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Deferred via queueMicrotask — same fix as HANDOVER.md Part 2 §17.2 for
    // "Calling setState synchronously within an effect" (the
    // react-hooks/set-state-in-effect rule); behavior is unchanged, this is
    // a one-time read on mount either way.
    queueMicrotask(() => {
      const lastUser = readLastKnownUser();
      if (lastUser) {
        const cached = readOfflineCache<DashboardOfflineSummary>(`dashboard:${lastUser.role}`, lastUser.userId);
        setEnvelope(cached);
      }
      setCheckedCache(true);
    });
  }, []);

  const dashboardHref = envelope ? `/${envelope.role}` : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-navy-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-navy-800 dark:bg-navy-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <WifiOff className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold text-navy-900 dark:text-white">You&apos;re offline</h1>
            <p className="text-sm text-slate-500 dark:text-navy-400">
              {isOnline ? "Connection restored — reload to continue." : "No internet connection right now."}
            </p>
          </div>
        </div>

        {isOnline ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        ) : checkedCache && envelope ? (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-400 dark:text-navy-500">
              Showing your last synced data, from {new Date(envelope.cachedAt).toLocaleString()}. This won&apos;t update until you&apos;re back online.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-800/60">
              <p className="font-medium text-navy-900 dark:text-white">{envelope.data.displayName}</p>
              {envelope.data.subtitle && <p className="text-sm text-slate-500 dark:text-navy-400">{envelope.data.subtitle}</p>}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {envelope.data.overallScore !== null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-navy-500">Overall score</p>
                    <p className="text-lg font-semibold text-navy-900 dark:text-white">{envelope.data.overallScore}%</p>
                  </div>
                )}
                {envelope.data.attendanceRate !== null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-navy-500">Attendance</p>
                    <p className="text-lg font-semibold text-navy-900 dark:text-white">{envelope.data.attendanceRate}%</p>
                  </div>
                )}
              </div>
            </div>
            {envelope.data.announcements.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-navy-500">
                  Recent announcements
                </p>
                <div className="space-y-2">
                  {envelope.data.announcements.map((a, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-navy-700">
                      <p className="font-medium text-navy-900 dark:text-white">{a.title}</p>
                      <p className="text-xs text-slate-400 dark:text-navy-500">{a.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : checkedCache ? (
          <p className="mt-5 text-sm text-slate-500 dark:text-navy-400">
            No cached data is available yet — connect once while online and it will be ready here next time.
          </p>
        ) : null}

        <Link href={dashboardHref} className="mt-5 block text-center text-sm font-medium text-navy-700 hover:text-navy-900 dark:text-gold-300 dark:hover:text-gold-200">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
