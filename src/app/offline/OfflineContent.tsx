"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/**
 * All the actual interactive logic for /offline lives here, in a client
 * component — kept separate from page.tsx (a plain Server Component) so
 * page.tsx can carry the `export const dynamic = "force-static"` route
 * segment config, which route-segment config exports require a server
 * boundary for. See page.tsx's own doc comment for why that config matters.
 *
 * The service worker shows this page only on a genuine network failure. It
 * used to also render a localStorage snapshot of the last dashboard — built
 * for Apple's App Store review — which was removed with the native apps
 * (HANDOVER Part 37); this is now a plain web "you're offline" screen.
 */
export function OfflineContent() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-navy-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-navy-800 dark:bg-navy-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <WifiOff className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="page-title-compact">You&apos;re offline</h1>
            <p className="text-sm text-slate-500 dark:text-navy-400">
              {isOnline ? "Connection restored — reload to continue." : "No internet connection right now."}
            </p>
          </div>
        </div>

        {isOnline && (
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5 w-full">
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        )}

        <Link href="/" className="mt-5 block text-center text-sm font-medium text-navy-700 hover:text-navy-900 dark:text-navy-200 dark:hover:text-white">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
