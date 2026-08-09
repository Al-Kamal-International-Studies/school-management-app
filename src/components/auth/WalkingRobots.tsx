"use client";

import { motion } from "framer-motion";
import { Robot } from "./Robot";

/**
 * Two small robot mascots that wander back and forth along the bottom edge
 * of the login page — a playful, "premium but fun" touch. Desktop only
 * (hidden on small screens where vertical space is precious for the form).
 */
export function WalkingRobots() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 overflow-hidden lg:block" aria-hidden="true">
      {/* ground line */}
      <div className="absolute inset-x-0 bottom-6 h-px bg-white/10" />

      <motion.div
        className="absolute bottom-6"
        style={{ left: "8%" }}
        animate={{ x: [0, 340, 340, 0, 0], scaleX: [1, 1, -1, -1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        <Robot accent="gold" />
      </motion.div>

      <motion.div
        className="absolute bottom-6"
        style={{ right: "10%" }}
        animate={{ x: [0, -280, -280, 0, 0], scaleX: [-1, -1, 1, 1, -1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 1.5, times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        <Robot accent="sky" />
      </motion.div>
    </div>
  );
}
