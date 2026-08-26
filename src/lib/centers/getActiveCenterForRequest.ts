import "server-only";

import { getCurrentProfile } from "@/lib/auth";
import { getAccessibleCenters } from "./getAccessibleCenters";
import { getActiveCenterId } from "./activeCenterCookie";

/**
 * Resolves the currently-active center for the logged-in profile — the same
 * validated resolution (dashboard)/layout.tsx already performs to drive the
 * center-switcher and the navy/gold branding, NOT a raw cookie read (a
 * stale/tampered cookie can never widen which center's data shows up, since
 * getActiveCenterId falls back to the profile's home center whenever the
 * cookie doesn't name a center this profile actually has access to).
 *
 * Every admin list/count/dashboard query that needs to scope its results to
 * "whichever center this admin currently has selected" should have its
 * page.tsx (or Server Action) call this once and thread the result down as
 * a parameter, rather than re-deriving it or reading ACTIVE_CENTER_COOKIE
 * directly. This is the "small shared helper" option from the multi-center
 * admin query audit, chosen over duplicating (dashboard)/layout.tsx's
 * three-call resolution inline in every admin page.tsx/actions.ts.
 *
 * getCurrentProfile() is wrapped in React's cache() (see lib/auth.ts's own
 * doc comment), so calling it again here is free — it resolves the same
 * memoized promise (dashboard)/layout.tsx (and requireRole()) already
 * triggered for this request, not a second round trip. getAccessibleCenters()
 * is a small indexed query on profile_center_access; for the overwhelming
 * majority of accounts (single-center) it returns exactly one row and
 * getActiveCenterId's cookie lookup is skipped entirely, so this is a no-op
 * for every single-center admin — their activeCenterId is always just their
 * own profile.center_id, identical to what every query already returned
 * before this helper existed (RLS was already narrowing them to their one
 * center regardless).
 *
 * Returns null only when there's no logged-in profile at all. Every caller
 * here is reached through a page/action already gated by
 * requireRole("admin") (or the (dashboard) layout's own auth redirect) on
 * the same request, so this is never actually null in practice — the
 * signature just stays honest about the unauthenticated case instead of
 * throwing.
 */
export async function getActiveCenterForRequest(): Promise<string | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const accessibleCenters = await getAccessibleCenters(profile.id);
  return accessibleCenters.length > 1
    ? await getActiveCenterId(
        profile.center_id,
        accessibleCenters.map((c) => c.id)
      )
    : profile.center_id;
}
