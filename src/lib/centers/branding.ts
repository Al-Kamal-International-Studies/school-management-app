/**
 * Frontend-side logo lookup, keyed by center short_code — mirrors how
 * Logo.tsx already hardcodes the AKIS crest paths rather than reading them
 * from configuration. `centers.logo_path` (DB) still carries a sensible
 * single default per center for any future non-UI use (e.g. an email
 * template); the switcher UI uses this map instead so it can pick the
 * correct light/dark variant, the same way Logo.tsx's `onLight` prop does.
 *
 * AKET's real crest (2026-08-16): `aket-seal.svg`, hand-recreated from a
 * reference image Muhammad supplied in chat — not a byte-exact copy, since
 * pasted chat images arrive as inline content with no readable file path
 * in this environment. Ask for the original vector source (SVG/AI/PDF) if
 * one exists, for a fully accurate swap. Self-contained (own fill colors)
 * so one asset works on both light and dark surfaces, same reasoning the
 * placeholder it replaced used.
 */
// The round "seal" variant (not the shield-shaped "crest") is used here on
// purpose — it's the one designed to sit inside a circular badge, which is
// what this compact switcher control needs.
export const CENTER_LOGO: Record<string, { light: string; dark: string }> = {
  AKIS: { light: "/brand/seal-navy.png", dark: "/brand/seal-white.png" },
  AKET: { light: "/brand/aket-seal.svg", dark: "/brand/aket-seal.svg" },
};

export function centerLogoSrc(shortCode: string): { light: string; dark: string } {
  return CENTER_LOGO[shortCode] ?? { light: "/brand/seal-navy.png", dark: "/brand/seal-white.png" };
}
