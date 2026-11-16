"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/logout/actions";
import { clearSessionFlags } from "@/lib/onboarding/storage";

// Prefix of the localStorage dashboard snapshots the (since removed) App
// Store offline cache wrote. Nothing writes these any more, but a shared
// computer may still hold one from before — sign-out keeps deleting them so
// a previous user's summary never lingers for whoever signs in next.
const LEGACY_OFFLINE_PREFIX = "akis-offline:";

function clearLegacyOfflineSnapshots() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(LEGACY_OFFLINE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // storage disabled / private mode — nothing to clear
  }
}

/**
 * Same form/action as before, wrapped in a client component only so the
 * legacy snapshot cleanup above (and the onboarding session flags, so the
 * next sign-in in this tab resumes unfinished onboarding) runs synchronously
 * before the form submits;
 * it never blocks or delays sign-out.
 */
export function SignOutForm({ label }: { label: string }) {
  return (
    <form
      action={signOutAction}
      onSubmit={() => {
        clearLegacyOfflineSnapshots();
        clearSessionFlags();
      }}
    >
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
