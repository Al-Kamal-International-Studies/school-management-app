"use client";

import { ACTIVE_CENTER_COOKIE } from "./constants";

/**
 * Persists the chosen active center client-side, same pattern as
 * setLocaleCookie.ts. Callers should follow this with a full navigation
 * (window.location, not router.push) so Server Components re-read the
 * cookie — Next's client-side router does not re-run layouts just because
 * a cookie (not the URL) changed.
 */
export function setActiveCenterCookie(centerId: string) {
  document.cookie = `${ACTIVE_CENTER_COOKIE}=${centerId}; path=/; max-age=31536000; samesite=lax`;
}
