"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";

const WALK_SECONDS = 4.5; // within the requested 4-5s
const WAVE_SECONDS = 2;
const WALK_DISTANCE = 200; // px, bounded track width

/**
 * Decorative mascot for the Feedback page: walks for ~4.5s, stops, waves
 * for 2s, resumes walking (flipping direction, bouncing between the two
 * ends of its track), repeats indefinitely. Purely decorative —
 * `pointer-events-none` + `aria-hidden`, absolutely positioned within a
 * bounded track so it never overlaps or shifts form content, and it's the
 * only thing animating continuously on the page (the form itself has no
 * competing animation), so it doesn't cost meaningful page performance.
 *
 * Respects prefers-reduced-motion: renders a single static waving pose
 * instead of the continuous walk/wave loop.
 */
export function FeedbackRobot() {
  const reduceMotion = useReducedMotion();
  const bodyControls = useAnimationControls();
  const armControls = useAnimationControls();
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (reduceMotion) {
      armControls.start({ rotate: -28 }, { duration: 0.4 });
      return;
    }

    let direction: 1 | -1 = 1;

    async function loop() {
      while (!cancelledRef.current) {
        // Walk to the other end of the track, bobbing gently as it goes.
        await bodyControls.start({
          x: direction === 1 ? WALK_DISTANCE : 0,
          scaleX: direction,
          y: [0, -3, 0, -3, 0, -3, 0],
          transition: { duration: WALK_SECONDS, ease: "easeInOut" },
        });
        if (cancelledRef.current) return;

        // Stop and wave.
        await armControls.start(
          { rotate: [0, -35, -10, -35, -10, -35, 0] },
          { duration: WAVE_SECONDS, ease: "easeInOut" }
        );
        if (cancelledRef.current) return;

        direction = direction === 1 ? -1 : 1;
      }
    }

    loop();
    return () => {
      cancelledRef.current = true;
    };
  }, [reduceMotion, bodyControls, armControls]);

  return (
    <div className="relative h-24 w-full max-w-xs overflow-hidden" aria-hidden="true">
      <motion.svg
        viewBox="0 0 64 76"
        className="absolute bottom-0 left-0 h-20 w-20 drop-shadow-lg"
        animate={bodyControls}
        initial={{ x: 0, scaleX: 1 }}
        style={{ transformOrigin: "50% 100%" }}
      >
        {/* antenna */}
        <line x1="32" y1="4" x2="32" y2="14" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="32" cy="4" r="3.5" fill="#d4af37" />

        {/* head */}
        <rect x="14" y="14" width="36" height="26" rx="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="25" cy="27" r="4.5" fill="#0f2131" />
        <circle cx="39" cy="27" r="4.5" fill="#0f2131" />
        <circle cx="26.3" cy="25.7" r="1.3" fill="#fff" />
        <circle cx="40.3" cy="25.7" r="1.3" fill="#fff" />

        {/* body */}
        <rect x="10" y="42" width="44" height="28" rx="10" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="32" cy="56" r="6" fill="#d4af37" opacity="0.9" />

        {/* left (static) arm */}
        <rect x="1" y="46" width="8" height="16" rx="4" fill="#cbd5e1" />

        {/* right (waving) arm — animates independently for the wave */}
        <motion.rect
          x="55"
          y="46"
          width="8"
          height="16"
          rx="4"
          fill="#cbd5e1"
          animate={armControls}
          style={{ transformOrigin: "59px 48px" }}
        />

        {/* legs */}
        <rect x="16" y="68" width="9" height="8" rx="3" fill="#94a3b8" />
        <rect x="39" y="68" width="9" height="8" rx="3" fill="#94a3b8" />
      </motion.svg>
    </div>
  );
}
