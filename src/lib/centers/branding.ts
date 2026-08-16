/**
 * Frontend-side logo lookup, keyed by center short_code — mirrors how
 * Logo.tsx already hardcodes the AKIS crest paths rather than reading them
 * from configuration. `centers.logo_path` (DB) still carries a sensible
 * single default per center for any future non-UI use (e.g. an email
 * template); the switcher UI uses this map instead so it can pick the
 * correct light/dark variant, the same way Logo.tsx's `onLight` prop does.
 *
 * AKET has no real logo yet — `aket-monogram.svg` is a placeholder built
 * from this app's existing navy/gold palette (tailwind.config.ts), self-
 * contained (own fill colors) so one asset works on both light and dark
 * surfaces, unlike the AKIS crest PNGs which need separate ink colors.
 * Swap it out here once Muhammad supplies AKET's real logo file.
 */
// The round "seal" variant (not the shield-shaped "crest") is used here on
// purpose — it's the one designed to sit inside a circular badge, which is
// what this compact switcher control needs.
export const CENTER_LOGO: Record<string, { light: string; dark: string }> = {
  AKIS: { light: "/brand/seal-navy.png", dark: "/brand/seal-white.png" },
  AKET: { light: "/brand/aket-monogram.svg", dark: "/brand/aket-monogram.svg" },
};

export function centerLogoSrc(shortCode: string): { light: string; dark: string } {
  return CENTER_LOGO[shortCode] ?? { light: "/brand/seal-navy.png", dark: "/brand/seal-white.png" };
}
