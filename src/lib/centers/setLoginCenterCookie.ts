"use client";

import { LOGIN_CENTER_COOKIE } from "./constants";

/**
 * Persists the visitor's chosen pre-login center, same pattern as
 * setActiveCenterCookie.ts / setLocaleCookie.ts. Callers should follow this
 * with a full navigation (window.location, not router.push) so the
 * server-rendered /login and /forgot-password pages re-read the cookie and
 * re-render with the newly selected center's branding — Next's client-side
 * router does not re-run Server Components just because a cookie (not the
 * URL) changed.
 */
export function setLoginCenterCookie(centerId: string) {
  document.cookie = `${LOGIN_CENTER_COOKIE}=${centerId}; path=/; max-age=31536000; samesite=lax`;
}
