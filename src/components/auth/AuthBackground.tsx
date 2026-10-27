/**
 * The institution's one decorative motif: the 8-point star lattice the
 * crest is drawn from (see public/brand), as fine white linework on a dark
 * brand surface, fading out downward over ~420px (DESIGN.md, "one brand
 * glow"). Used on the sign-in branding panel and the first-launch welcome
 * screens only. Static: no drifting blobs, nothing that loops.
 *
 * Absolutely positioned behind its parent's content (`-z-0` with the parent
 * creating the stacking context via `relative isolate`), and aria-hidden.
 *
 * The pattern id is passed in so two instances on one page could never
 * collide on a shared `url(#…)` reference.
 */
export function AuthBackground({ patternId = "brand-star-lattice" }: { patternId?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-x-0 top-0 h-[520px] w-full text-white/[0.07]"
        style={{ maskImage: "linear-gradient(to bottom, black, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent)" }}
      >
        <defs>
          <pattern id={patternId} width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="18" y="18" width="36" height="36" />
              <rect x="18" y="18" width="36" height="36" transform="rotate(45 36 36)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
