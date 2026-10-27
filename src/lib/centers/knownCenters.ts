import { AKIS_CENTER_ID } from "@/lib/types/database.types";

// This web app serves one institution, Al Kamal International Studies
// (AKET was removed — HANDOVER Part 37). The database keeps its `centers`
// table and `center_id` columns (0027_centers.sql); every query is still
// scoped to AKIS's fixed row, so this mirrors that one row without a
// database read (the sign-in pages render it before any Supabase call).
export type KnownCenterShortCode = "AKIS";

export interface KnownCenter {
  id: string;
  short_code: KnownCenterShortCode;
  name: string;
}

export const AKIS_CENTER: KnownCenter = { id: AKIS_CENTER_ID, short_code: "AKIS", name: "Al Kamal International Studies" };

/** Kept as a name so existing call sites read naturally; it is AKIS. */
export const DEFAULT_KNOWN_CENTER: KnownCenter = AKIS_CENTER;
