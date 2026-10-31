import "server-only";

import { getCurrentProfile } from "@/lib/auth";
import { getAppCenterId } from "@/lib/centers/hasAkisAccess";

/**
 * The center every query is scoped to. Single-institution app (AKIS only,
 * HANDOVER Part 37): there is no center switcher any more, so this is AKIS
 * for any signed-in AKIS profile — DEMO for the prospects' demo accounts
 * (Part 45) — and null when signed out or without access. Kept as a function so
 * the admin pages/actions that thread `activeCenterId` into their queries
 * stay unchanged, and so the null-when-signed-out contract they rely on
 * still holds. Access itself is enforced at login and in the dashboard
 * layout (see hasAkisAccess.ts), never here.
 */
export async function getActiveCenterForRequest(): Promise<string | null> {
  const profile = await getCurrentProfile();
  return profile ? getAppCenterId(profile.id) : null;
}
