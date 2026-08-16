// Plain constant, no "server-only" — imported by both the server-side
// cookie reader (activeCenterCookie.ts) and the client-side cookie writer
// (setActiveCenterCookie.ts). Keeping it here (rather than in
// activeCenterCookie.ts, which does import "server-only") is what stops the
// client bundle from ever pulling in a server-only module — the same split
// locales.ts (LOCALE_COOKIE) already uses for getLocale.ts/setLocaleCookie.ts.
export const ACTIVE_CENTER_COOKIE = "active_center_id";
