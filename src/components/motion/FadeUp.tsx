import type { ReactNode } from "react";

/**
 * Layout-only wrappers, kept so the ~60 pages that use them compile
 * unchanged.
 *
 * Redesign (DESIGN.md, "one animation per change"): these used to give
 * every block on a page its own staggered fade-up, on top of the route-level
 * fade in PageTransition.tsx — two or more animations for a single
 * navigation, which reads as nervous rather than composed. The route change
 * is now the only thing that animates (PageTransition); everything inside a
 * page renders in place, at full opacity, from the first paint.
 *
 * Because nothing here animates any more, the old "stuck at opacity:0"
 * failure mode these components were rewritten to avoid (HANDOVER.md, the
 * entrance-animation fill-mode bug) cannot occur at all.
 */
export function FadeUp({
  children,
  className,
}: {
  children: ReactNode;
  /** Ignored — retained for call-site compatibility. */
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function FadeUpStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** Ignored — retained for call-site compatibility. */
  staggerDelay?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function FadeUpItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
