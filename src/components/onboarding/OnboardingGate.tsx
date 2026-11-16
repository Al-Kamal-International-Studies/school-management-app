"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fill, framework } from "@/lib/onboarding/i18n/framework";
import { gettingStartedHref, markSessionHandled, parseProgress, readRaw, sessionHandled } from "@/lib/onboarding/storage";
import { needsOnboarding } from "@/lib/onboarding/version";
import type { Profile } from "@/lib/types/database.types";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Mounted once by DashboardShell for signed-in users.
 *
 * - If onboarding is still to do (never finished, or behind
 *   ONBOARDING_VERSION) and it hasn't been opened or paused in this browser
 *   session, sends the person to /getting-started once. The sessionStorage
 *   flag is set before redirecting, so it can't loop. The page that was
 *   asked for (path, query and hash) goes along as ?next=, so "Continue
 *   later" and Finish land there instead of on the dashboard.
 * - Otherwise, while onboarding is unfinished, shows a slim banner with the
 *   progress kept on this device. The banner can be dismissed for the page
 *   being viewed.
 *
 * It runs inside DashboardShell, i.e. only after every security gate in
 * requireDashboardAccess() has passed, so it never bypasses them.
 */
export function OnboardingGate({ profile }: { profile: Pick<Profile, "id" | "has_seen_tour" | "tour_version_seen"> }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const t = framework[locale].banner;
  const needs = needsOnboarding(profile);

  const raw = useSyncExternalStore(
    subscribeStorage,
    () => (needs ? readRaw(profile.id) : null),
    () => null,
  );
  // False on the server and during hydration, so the banner never flashes
  // before the redirect effect below has had its chance.
  const handled = useSyncExternalStore(
    subscribeStorage,
    () => sessionHandled(profile.id),
    () => false,
  );
  const progress = useMemo(() => parseProgress(raw), [raw]);
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);

  useEffect(() => {
    if (!needs || pathname.startsWith("/getting-started")) return;
    if (sessionHandled(profile.id)) return;
    markSessionHandled(profile.id);
    const { pathname: path, search, hash } = window.location;
    router.replace(gettingStartedHref(path + search + hash));
  }, [needs, pathname, profile.id, router]);

  if (!needs || !handled || dismissedOn === pathname) return null;

  const showCount = !!progress && progress.total > 0;
  return (
    <div
      role="region"
      aria-label={t.noCount}
      className="flex items-center gap-3 border-b border-navy-200 bg-navy-50 px-4 py-2 text-sm text-navy-900 sm:px-6 lg:px-8 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100"
    >
      <p className="min-w-0 flex-1">
        {showCount ? fill(t.withCount, { done: progress.completed.length, total: progress.total }) : t.noCount}
      </p>
      <Link
        href={gettingStartedHref(pathname)}
        onClick={(e) => {
          // Keep the query and hash too (usePathname has neither).
          const { pathname: path, search, hash } = window.location;
          if (!search && !hash) return;
          e.preventDefault();
          router.push(gettingStartedHref(path + search + hash));
        }}
        className="shrink-0 rounded text-sm font-medium underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:focus-visible:ring-navy-300"
      >
        {t.continue}
      </Link>
      <button
        type="button"
        onClick={() => setDismissedOn(pathname)}
        aria-label={t.dismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-navy-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:hover:bg-white/10 dark:focus-visible:ring-navy-300"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
