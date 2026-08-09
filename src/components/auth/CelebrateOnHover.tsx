"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

const COLORS = ["#d4af37", "#f3d878", "#ffffff", "#7fb8e0", "#eec158"];

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  shape: "circle" | "square";
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + (Math.random() * 20 - 10),
    distance: 42 + Math.random() * 30,
    size: 4 + Math.random() * 4,
    color: COLORS[i % COLORS.length]!,
    delay: Math.random() * 0.08,
    shape: Math.random() > 0.5 ? "circle" : "square",
  }));
}

/**
 * Wraps a trigger element (e.g. the Sign In button) and bursts a small
 * confetti/sparkle animation outward from its center on hover.
 */
export function CelebrateOnHover({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const particles = useMemo(() => makeParticles(14), []);

  return (
    <div
      className="relative inline-block w-full"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <AnimatePresence>
          {active &&
            particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const x = Math.cos(rad) * p.distance;
              const y = Math.sin(rad) * p.distance;
              return (
                <motion.span
                  key={p.id}
                  className="absolute"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.shape === "circle" ? "9999px" : "2px",
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x, y, opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
                />
              );
            })}
        </AnimatePresence>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
