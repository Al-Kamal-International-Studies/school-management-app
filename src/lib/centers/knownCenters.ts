import { AKIS_CENTER_ID, AKET_CENTER_ID } from "@/lib/types/database.types";

// Hardcoded, mirroring the two fixed rows seeded by 0027_centers.sql
// (`centers` table) — deliberately NOT a database read. The pages that need
// this (/login, /forgot-password) render before any authentication and
// before the app has ever talked to Supabase for this visitor, so keeping
// the pre-login center picker/branding entirely dependency-free (no query,
// no chance of a Supabase hiccup blocking the sign-in page itself from
// rendering) is worth the small duplication. Same "hardcode + mirror the
// DB" pattern branding.ts's CENTER_LOGO map already uses for the same
// reason. If a third center is ever added, this needs a matching update —
// there is no test enforcing that today.
export type KnownCenterShortCode = "AKIS" | "AKET";

export interface KnownCenter {
  id: string;
  short_code: KnownCenterShortCode;
  name: string;
}

const AKIS_CENTER: KnownCenter = { id: AKIS_CENTER_ID, short_code: "AKIS", name: "Al Kamal International Studies" };
const AKET_CENTER: KnownCenter = { id: AKET_CENTER_ID, short_code: "AKET", name: "Al Kamal Education Technology" };

export const KNOWN_CENTERS: Record<string, KnownCenter> = {
  [AKIS_CENTER_ID]: AKIS_CENTER,
  [AKET_CENTER_ID]: AKET_CENTER,
};

export const DEFAULT_KNOWN_CENTER: KnownCenter = AKIS_CENTER;

// Stable UI order for the picker — AKIS first, always, regardless of any
// name-based sort used elsewhere (e.g. getAccessibleCenters' `.order("name")`,
// which is for the post-login switcher's own dropdown, a separate concern).
export const KNOWN_CENTER_LIST: KnownCenter[] = [AKIS_CENTER, AKET_CENTER];

/** Resolves any id (trusted or not) to a known center, defaulting to AKIS
 * for anything unrecognized — never throws, safe to call with a raw cookie
 * value or a `profiles.center_id` value alike. */
export function knownCenterFor(id: string | null | undefined): KnownCenter {
  return (id && KNOWN_CENTERS[id]) || DEFAULT_KNOWN_CENTER;
}
