import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Fade up" entrance: content starts slightly below and transparent,
 * settles into place. Plain CSS keyframe (`animate-fade-in-up`, defined in
 * tailwind.config.ts) instead of Framer Motion — this used to be a
 * `motion.div` with `initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}`,
 * which depends on a post-hydration JS effect actually firing to reach
 * opacity:1. In real testing that was found stuck at its initial
 * (invisible) state, with no fallback — and since this component (and
 * FadeUpStagger/FadeUpItem below) is used on nearly every dashboard page
 * in the app, that failure mode wasn't cosmetic, it could leave a
 * logged-in user staring at a blank page. A CSS keyframe doesn't have that
 * failure mode: it's attached the instant the browser computes this
 * element's style, runs on the compositor timeline (not a JS tick that
 * React/Framer Motion can miss), and its before/after states are both
 * just this element's normal, fully-opaque CSS — there's no code path
 * that leaves the content permanently invisible.
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
    <div className={cn("animate-fade-in-up", className)} style={delay ? { animationDelay: `${delay * 1000}ms` } : undefined}>
      {children}
    </div>
  );
}

interface FadeUpItemProps {
  children: ReactNode;
  className?: string;
  /** Injected by FadeUpStagger below — not meant to be passed directly. */
  __delayMs?: number;
}

/**
 * Wrap a group of FadeUpItem children (e.g. a grid of stat cards or a
 * list) to have them fade up one after another instead of all at once.
 * Computes each child's stagger delay here (via Children.map +
 * cloneElement, matched by element type) rather than asking every call
 * site to pass an index — every existing
 * `<FadeUpStagger><FadeUpItem>…</FadeUpItem></FadeUpStagger>` call site
 * (~40 of them across the app) keeps working completely unchanged.
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
  const items = Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) =>
        isValidElement(child) && child.type === FadeUpItem
          ? cloneElement(child as ReactElement<FadeUpItemProps>, { __delayMs: i * staggerDelay * 1000 })
          : child,
      )}
    </div>
  );
}

export function FadeUpItem({ children, className, __delayMs = 0 }: FadeUpItemProps) {
  return (
    <div className={cn("animate-fade-in-up", className)} style={__delayMs ? { animationDelay: `${__delayMs}ms` } : undefined}>
      {children}
    </div>
  );
}
