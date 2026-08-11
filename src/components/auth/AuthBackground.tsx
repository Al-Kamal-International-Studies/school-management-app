"use client";

import { motion } from "framer-motion";

/**
 * Decorative background for every auth-family screen (AuthShell wraps
 * login, forgot-password, force-password-change, devices/manage) — a soft
 * navy/gold color wash, an 8-point geometric star lattice (the same
 * architectural motif this app's crest draws from — see public/brand —
 * kept as understated linework, not an illustration), and two slow-drifting
 * glow blobs. Sits as the *first* child of AuthShell's relative flex
 * wrapper so it paints behind both the branding panel (which has its own
 * opaque `bg-navy-gradient` and covers it there) and the form panel (which
 * doesn't, so this shows through) — see AuthShell.tsx for why DOM order
 * alone is enough to get that layering right, no z-index needed.
 *
 * `text-*` (not a literal color) drives the star lattice's stroke via
 * `currentColor`, so one SVG works in both themes just by switching the
 * Tailwind color class — no duplicated markup.
 */
export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-50 via-slate-50 to-gold-50/50 dark:from-navy-950 dark:via-navy-950 dark:to-navy-900" />

      <svg className="absolute inset-0 h-full w-full text-navy-900/[0.05] dark:text-white/[0.055]">
        <defs>
          <pattern id="auth-star-lattice" width="88" height="88" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="22" y="22" width="44" height="44" />
              <rect x="22" y="22" width="44" height="44" transform="rotate(45 44 44)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-star-lattice)" />
      </svg>

      <motion.div
        className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gold-300/25 blur-3xl dark:bg-gold-500/10"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-navy-300/25 blur-3xl dark:bg-navy-600/15"
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
    </div>
  );
}
