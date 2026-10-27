"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A circular progress indicator for a 0-100 score, hand-rolled with plain
 * SVG (hand-drawn, like Sparkline.tsx — no charting library in
 * this project). Animates the stroke in on mount unless the visitor prefers
 * reduced motion, in which case it renders at its final value immediately.
 */
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
}: {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  // Status colours carry one meaning each app-wide (DESIGN.md): green =
  // on track, amber = needs attention, red = at risk.
  const color = clamped >= 75 ? "#059669" : clamped >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-navy-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-2xl font-semibold leading-none text-navy-950 dark:text-white">{clamped.toFixed(1)}</span>
        {label && <span className="mt-1 text-[11px] font-medium text-slate-500 dark:text-navy-400">{label}</span>}
      </div>
    </div>
  );
}
