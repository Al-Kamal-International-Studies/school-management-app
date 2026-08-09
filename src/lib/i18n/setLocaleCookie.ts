"use client";

import { LOCALE_COOKIE, type Locale } from "./locales";

/**
 * Persists the chosen language client-side. Callers should follow this with
 * a full navigation (window.location, not router.push) so the root layout's
 * Server Component re-reads the cookie and re-renders <html lang dir> —
 * Next's client-side router does not re-run layouts just because a cookie
 * (not the URL) changed.
 */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
