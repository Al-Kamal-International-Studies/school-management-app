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
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-navy-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  );
}
