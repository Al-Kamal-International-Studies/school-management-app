// Plain constant, no "server-only" — imported by both the server-side
// cookie reader (activeCenterCookie.ts) and the client-side cookie writer
// (setActiveCenterCookie.ts). Keeping it here (rather than in
// activeCenterCookie.ts, which does import "server-only") is what stops the
// client bundle from ever pulling in a server-only module — the same split
// locales.ts (LOCALE_COOKIE) already uses for getLocale.ts/setLocaleCookie.ts.
export const ACTIVE_CENTER_COOKIE = "active_center_id";

// A genuinely separate concern from ACTIVE_CENTER_COOKIE above, despite the
// similar name/shape — that one is a POST-login "which center's data am I
// viewing" preference, validated on every read against the signed-in
// account's real profile_center_access grants (activeCenterCookie.ts).
// This one is the PRE-login "which center am I trying to log into" choice,
// read by an unauthenticated visitor on /login and /forgot-password
// (loginCenterCookie.ts) and by completeLogin.ts as the actual login-time
// access check. See completeLogin.ts's own comment for exactly how (and
// when) a value here gets bridged into ACTIVE_CENTER_COOKIE on a
// successful login.
export const LOGIN_CENTER_COOKIE = "login_center_id";
