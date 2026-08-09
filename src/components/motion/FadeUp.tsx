"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Standard "fade up" entrance: content starts slightly below and
 * transparent, settles into place. Use for a single section/card.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap a group of FadeUpItem children (e.g. a grid of stat cards or a
 * list) to have them fade up one after another instead of all at once.
 */
export function FadeUpStagger({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeUpItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
