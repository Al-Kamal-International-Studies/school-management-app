"use client";

import { useSyncExternalStore } from "react";

/**
 * Same useSyncExternalStore shape Sidebar.tsx already established for
 * "read a browser-only value without a hydration mismatch or an
 * effect-based setState" (see that file's own subscribeCollapsed/
 * getCollapsedSnapshot/getCollapsedServerSnapshot) — network status is the
 * same kind of value: only knowable client-side, and the server/first
 * client render must agree on some placeholder until then.
 * getServerSnapshot always returns true ("online") so nothing ever shows
 * an offline state during SSR or the first paint before hydration —
 * exactly matching real online users' actual experience, and erring
 * toward "no banner" rather than a flash of an incorrect one.
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
