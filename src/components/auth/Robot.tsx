"use client";

import { motion } from "framer-motion";

interface RobotProps {
  accent?: "gold" | "sky";
  bob?: boolean;
}

/** A small friendly geometric robot mascot, static — wrapped by WalkingRobots for motion. */
export function Robot({ accent = "gold", bob = true }: RobotProps) {
  const accentColor = accent === "gold" ? "#d4af37" : "#7fb8e0";

  return (
    <motion.svg
      viewBox="0 0 64 76"
      className="h-14 w-14 drop-shadow-lg sm:h-16 sm:w-16"
      animate={bob ? { y: [0, -4, 0] } : undefined}
      transition={bob ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {/* antenna */}
      <line x1="32" y1="4" x2="32" y2="14" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="32" cy="4" r="3.5" fill={accentColor} />

      {/* head */}
      <rect x="14" y="14" width="36" height="26" rx="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="25" cy="27" r="4.5" fill="#0f2131" />
      <circle cx="39" cy="27" r="4.5" fill="#0f2131" />
      <circle cx="26.3" cy="25.7" r="1.3" fill="#fff" />
      <circle cx="40.3" cy="25.7" r="1.3" fill="#fff" />

      {/* body */}
      <rect x="10" y="42" width="44" height="28" rx="10" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="32" cy="56" r="6" fill={accentColor} opacity="0.9" />

      {/* arms */}
      <rect x="1" y="46" width="8" height="16" rx="4" fill="#cbd5e1" />
      <rect x="55" y="46" width="8" height="16" rx="4" fill="#cbd5e1" />

      {/* legs */}
      <rect x="16" y="68" width="9" height="8" rx="3" fill="#94a3b8" />
      <rect x="39" y="68" width="9" height="8" rx="3" fill="#94a3b8" />
    </motion.svg>
  );
}
