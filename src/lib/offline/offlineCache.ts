"use client";

/**
 * Client-side "last known good" cache for a small set of high-value,
 * read-only dashboard summaries — the actual answer to Apple's Guideline
 * 4.2 ask for "real offline behavior: cached content ... not a blank
 * screen" (see HANDOVER.md's App Store plan). Deliberately narrow in scope,
 * not a general offline-data-sync system:
 *
 *  - This app's service worker (public/sw.js) already made a considered,
 *    documented decision to never cache API/HTML responses at the network
 *    layer, since this is an auth-gated, per-user-data app — caching
 *    someone else's data into a shared cache is exactly the class of bug
 *    that comment warns about. This is why the cache here lives in
 *    localStorage, explicitly namespaced by the CURRENT signed-in user's
 *    own id, not in the service worker's Cache Storage.
 *  - Only ever written with data the signed-in user was already correctly
 *    authorized to see (it's a copy of what a Server Component already
 *    fetched, RLS-scoped, for THIS request) — never a new access path.
 *  - Read-only by design: nothing offline ever lets a write happen against
 *    stale/cached state (see OfflineBanner.tsx and the /offline page —
 *    neither renders any form or mutation control).
 *  - Cleared on sign-out (see settings/actions.ts's signOutAction — not
 *    modified by this file directly, but relies on the same localStorage
 *    key prefix so a clear-all-offline-keys pass is simple to add there;
 *    see this file's clearAllOfflineCache export).
 */

const PREFIX = "akis-offline:";
const LAST_USER_KEY = `${PREFIX}last-user`;

export interface OfflineEnvelope<T> {
  userId: string;
  role: string;
  data: T;
  cachedAt: string; // ISO timestamp
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Writes a small, JSON-serializable summary for `pageKey` (e.g. "parent-dashboard"),
 *  scoped to `userId`. Silently no-ops if localStorage is unavailable (private
 *  browsing, storage disabled, etc.) — this is a nice-to-have, never load-bearing
 *  for the app's normal online behavior. */
export function writeOfflineCache<T>(pageKey: string, userId: string, role: string, data: T): void {
  if (!isBrowser()) return;
  try {
    const envelope: OfflineEnvelope<T> = { userId, role, data, cachedAt: new Date().toISOString() };
    window.localStorage.setItem(`${PREFIX}${pageKey}`, JSON.stringify(envelope));
    window.localStorage.setItem(LAST_USER_KEY, JSON.stringify({ userId, role }));
  } catch {
    // Quota exceeded or storage disabled — never block the page over this.
  }
}

/** Reads back whatever was last cached for `pageKey`, if any, and only if it
 *  belongs to `userId` — a stale cache from a previously signed-in different
 *  user on the same device must never be shown to the next person who signs in. */
export function readOfflineCache<T>(pageKey: string, userId: string): OfflineEnvelope<T> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${pageKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineEnvelope<T>;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Used by the standalone /offline fallback page, which has no server-side
 *  session of its own to read (it's the one genuinely static, no-auth route
 *  in this app — see app/offline/page.tsx) — this is how it knows whose
 *  cache to show without ever being able to call getCurrentProfile() itself. */
export function readLastKnownUser(): { userId: string; role: string } | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Called on sign-out (settings/actions.ts's signOutAction triggers this via
 *  SignOutButton.tsx client-side, alongside the actual server sign-out) so a
 *  shared/public device never keeps a previous user's cached summary around
 *  for the next person to sign in and land on the offline page. */
export function clearAllOfflineCache(): void {
  if (!isBrowser()) return;
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}
