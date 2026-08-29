import { OfflineContent } from "./OfflineContent";

/**
 * The one genuinely static, no-auth, no-server-fetch route in this app —
 * deliberately so. Every other page here calls getCurrentProfile()/
 * requireRole() (cookies, a live Supabase round trip) and is server-
 * rendered dynamically on every request; even without that, this app's
 * shared root layout.tsx itself reads cookies (getLocale()/getTheme()),
 * which alone would make every route dynamic by inheritance —
 * `force-static` overrides that specifically for this one route (per
 * Next.js's own docs: it forces cookies()/headers() to resolve to empty
 * values during the prerender instead of opting the route into dynamic
 * rendering), which is fine here since this page doesn't use the caller's
 * actual locale/theme at all — it's meant to render identically for
 * anyone, with zero request context, since that's exactly the condition
 * it exists for. This is what lets Next.js prerender this route fully at
 * build time into plain static HTML/JS, which is exactly what
 * public/sw.js's service worker needs to be able to serve this page from
 * cache with ZERO network access at all (see sw.js's navigation-fallback
 * fetch handler).
 *
 * Actual content lives in OfflineContent.tsx (a client component, needed
 * for the localStorage/online-status logic) — kept in a separate file
 * because route segment config exports like `dynamic` need a Server
 * Component boundary, and this file is intentionally that boundary.
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return <OfflineContent />;
}
