import "server-only";

import { cookies } from "next/headers";
import { AKIS_CENTER_ID, AKET_CENTER_ID } from "@/lib/types/database.types";
import { LOGIN_CENTER_COOKIE } from "./constants";

const KNOWN_LOGIN_CENTER_IDS = new Set([AKIS_CENTER_ID, AKET_CENTER_ID]);

/** Raw cookie value, but only if it's actually one of the two known center
 * ids — null if the visitor has never explicitly chosen one on this
 * browser (or the cookie is missing/stale/tampered with). Kept separate
 * from getLoginCenterId() below because callers care about this
 * "explicit or not" distinction differently: the /login and
 * /forgot-password pages always want a concrete center to render against
 * (defaulting to AKIS is correct there), while completeLogin.ts's decision
 * to overwrite the POST-login active-center cookie specifically needs to
 * know whether this was a real choice, not a default — see its comment. */
async function readLoginCenterCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOGIN_CENTER_COOKIE)?.value;
  return value && KNOWN_LOGIN_CENTER_IDS.has(value) ? value : null;
}

/**
 * The center id to log in against right now — used both for rendering
 * (/login, /forgot-password show this center's branding) and for
 * enforcement (completeLogin.ts rejects a login whose account has no
 * profile_center_access grant for this id). Defaults to AKIS when nothing
 * has been explicitly chosen yet, matching this app's pre-existing
 * single-center behavior for a first-ever visitor to this browser — and,
 * deliberately, this default is enforced too: an AKET-only account that
 * never touches the picker and just signs in gets rejected exactly as if
 * they'd explicitly picked AKIS, per Muhammad's "no matter what" framing
 * of this feature. This is a pure cookie read, never a trust boundary on
 * its own — every real access decision this value feeds into is checked
 * again against the account's actual profile_center_access rows.
 */
export async function getLoginCenterId(): Promise<string> {
  return (await readLoginCenterCookie()) ?? AKIS_CENTER_ID;
}

/** Whether the visitor has explicitly picked a center on this browser, as
 * opposed to silently landing on the AKIS default because the picker was
 * simply never touched. See completeLogin.ts. */
export async function hasExplicitLoginCenterSelection(): Promise<boolean> {
  return (await readLoginCenterCookie()) !== null;
}
