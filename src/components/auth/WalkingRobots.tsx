"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Robot } from "./Robot";

/** Matches Tailwind's `lg`/`sm` breakpoints so the JS-driven `x` animation
 * (Framer Motion animates a literal pixel offset, which Tailwind classes
 * can't reach) picks a travel distance that actually fits the viewport. */
function useWalkDistance() {
  const [distance, setDistance] = useState(90); // mobile-safe default for the very first render

  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 640px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    function update() {
      setDistance(lgQuery.matches ? 340 : mdQuery.matches ? 180 : 90);
    }
    update();
    mdQuery.addEventListener("change", update);
    lgQuery.addEventListener("change", update);
    return () => {
      mdQuery.removeEventListener("change", update);
      lgQuery.removeEventListener("change", update);
    };
  }, []);

  return distance;
}

/**
 * Two small robot mascots that wander back and forth along the bottom edge
 * of the login page — a playful, "premium but fun" touch. Visible at every
 * viewport size: the strip height and walk distance both scale down on
 * small screens (a narrow phone can't fit the desktop's 340px walk) rather
 * than being hidden outright, which is what a previous `hidden lg:block`
 * version did — the robots simply never rendered below 1024px, i.e. on any
 * phone. That's the bug this fixes.
 */
export function WalkingRobots() {
  const distance = useWalkDistance();
  const rightDistance = Math.round(distance * 0.82);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden sm:h-20 lg:h-24"
      aria-hidden="true"
    >
      {/* ground line */}
      <div className="absolute inset-x-0 bottom-4 h-px bg-white/10 sm:bottom-5 lg:bottom-6" />

      <motion.div
        className="absolute bottom-4 scale-75 sm:bottom-5 sm:scale-90 lg:bottom-6 lg:scale-100"
        style={{ left: "6%" }}
        animate={{ x: [0, distance, distance, 0, 0], scaleX: [1, 1, -1, -1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        <Robot accent="gold" />
      </motion.div>

      <motion.div
        className="absolute bottom-4 scale-75 sm:bottom-5 sm:scale-90 lg:bottom-6 lg:scale-100"
        style={{ right: "8%" }}
        animate={{ x: [0, -rightDistance, -rightDistance, 0, 0], scaleX: [-1, -1, 1, 1, -1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 1.5, times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        <Robot accent="sky" />
      </motion.div>
    </div>
  );
}
