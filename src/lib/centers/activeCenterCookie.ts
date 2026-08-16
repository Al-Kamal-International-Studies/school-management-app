import "server-only";

import { cookies } from "next/headers";
import { ACTIVE_CENTER_COOKIE } from "./constants";

/**
 * Reads the visitor's chosen "active center" cookie, validated against the
 * list of centers this profile actually has access to (an accessible list
 * of length 1 — the overwhelming majority of accounts — makes this trivial:
 * the cookie is ignored and that one center wins). Falls back to the
 * profile's home center if the cookie is missing, unreadable, or points at
 * a center this profile no longer has access to — this can never widen
 * access on its own, since every real read still goes through RLS's
 * has_center_access() check independently.
 */
export async function getActiveCenterId(homeCenterId: string, accessibleCenterIds: string[]): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_CENTER_COOKIE)?.value;
  if (value && accessibleCenterIds.includes(value)) return value;
  return homeCenterId;
}
