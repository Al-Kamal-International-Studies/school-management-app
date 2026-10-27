"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/logout/actions";
import { clearAllOfflineCache } from "@/lib/offline/offlineCache";

/**
 * Same form/action as before, just wrapped in a client component so
 * signing out can also clear the offline dashboard cache (see
 * lib/offline/offlineCache.ts) — a shared/public device must never keep a
 * previous user's cached summary around for whoever signs in next. Runs
 * synchronously before the form's normal submission continues; doesn't
 * block or delay sign-out.
 */
export function SignOutForm({ label }: { label: string }) {
  return (
    <form action={signOutAction} onSubmit={() => clearAllOfflineCache()}>
      <button
        type="submit"
        aria-label={label}
        className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  );
}
