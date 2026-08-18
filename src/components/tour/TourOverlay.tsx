"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTour } from "@/lib/tour/TourProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;
const VIEWPORT_MARGIN = 16;
const DEFAULT_TOOLTIP_SIZE = { width: 340, height: 220 };

function resolveSelector(step: { target: { kind: "nav"; href: string } | { kind: "element"; selector: string } | { kind: "center" } }): string | null {
  if (step.target.kind === "nav") return `[data-tour-nav="${step.target.href}"]`;
  if (step.target.kind === "element") return step.target.selector;
  return null;
}

/**
 * Clamps `value` (a box's position along one axis) so the box of `size`
 * stays fully inside `[0, viewportSize]`, with `margin` of breathing room
 * on each side when there's room for it. Unlike a naive
 * `min(max(value, margin), viewportSize - size - margin)`, this degrades
 * gracefully instead of overflowing when `size` itself doesn't leave room
 * for a full margin on both sides (a box wider/taller than
 * `viewportSize - margin * 2`, which the CSS side of this component avoids
 * via `w-[min(92vw,340px)]`, but this stays correct even if that ever
 * stops being true — e.g. a very narrow phone in landscape, or unusually
 * long translated copy pushing the panel's real height up): the margin
 * itself shrinks (down to 0) rather than letting the upper bound end up
 * below the lower bound, which is what let the panel render partly
 * off-screen before this fix.
 */
function clamp1D(value: number, size: number, viewportSize: number, margin: number): number {
  const maxMargin = Math.max(0, (viewportSize - size) / 2);
  const effectiveMargin = Math.min(margin, maxMargin);
  const min = effectiveMargin;
  const max = Math.max(effectiveMargin, viewportSize - size - effectiveMargin);
  return Math.min(Math.max(value, min), max);
}

function computePlacement(rect: Rect | null, size: { width: number; height: number }): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    // Deliberately NOT `left: 50%; transform: translate(-50%, -50%)` — this
    // element also carries `animate-fade-in-up` (see the className below),
    // whose keyframe sets its own `transform: translateY(...)`. A CSS
    // keyframe animation replaces an element's *entire* computed transform
    // for its duration and — with `fill-mode: both`, which this animation
    // uses — permanently after it ends too, the exact same clobbering bug
    // WelcomeRobot.tsx's own doc comments already warned about for a
    // different element. It silently ate the `translate(-50%, -50%)` here,
    // so the "centered" welcome step actually rendered flush against the
    // container's top-left-of-center point, unshifted — invisible at a wide
    // desktop viewport (still happens to fit on-screen), but genuinely
    // off-screen on a narrow one (confirmed: at 375px wide, the panel's
    // right edge landed 153px past the viewport edge). Computing the true
    // pixel `left`/`top` from the already-known panel `size` instead avoids
    // `transform` for positioning entirely, so there's nothing left for the
    // entrance animation's own transform to clobber — same technique the
    // "real target" branch below already uses.
    const left = clamp1D(vw / 2 - size.width / 2, size.width, vw, VIEWPORT_MARGIN);
    const top = clamp1D(vh / 2 - size.height / 2, size.height, vh, VIEWPORT_MARGIN);
    return { top: Math.round(top), left: Math.round(left) };
  }

  // Space is measured from the spotlight ring's own (padded) edge, not the
  // raw target rect, so the tooltip never tries to squeeze into the gap
  // the ring itself is about to occupy.
  const spaceRight = vw - (rect.left + rect.width + SPOTLIGHT_PADDING);
  const spaceLeft = rect.left - SPOTLIGHT_PADDING;
  const spaceBelow = vh - (rect.top + rect.height + SPOTLIGHT_PADDING);

  let top: number;
  let left: number;

  if (spaceRight >= size.width + VIEWPORT_MARGIN || spaceLeft >= size.width + VIEWPORT_MARGIN) {
    const placeRight = spaceRight >= spaceLeft;
    left = placeRight ? rect.left + rect.width + SPOTLIGHT_PADDING + VIEWPORT_MARGIN : rect.left - SPOTLIGHT_PADDING - size.width - VIEWPORT_MARGIN;
    top = rect.top + rect.height / 2 - size.height / 2;
  } else {
    left = rect.left + rect.width / 2 - size.width / 2;
    top =
      spaceBelow >= size.height + VIEWPORT_MARGIN
        ? rect.top + rect.height + SPOTLIGHT_PADDING + VIEWPORT_MARGIN
        : rect.top - SPOTLIGHT_PADDING - size.height - VIEWPORT_MARGIN;
  }

  left = clamp1D(left, size.width, vw, VIEWPORT_MARGIN);
  top = clamp1D(top, size.height, vh, VIEWPORT_MARGIN);

  return { top: Math.round(top), left: Math.round(left) };
}

/**
 * The guided-tour overlay: a dimmed backdrop, an optional "spotlight" ring
 * (a transparent box whose oversized box-shadow darkens everything outside
 * its own bounds — no SVG mask needed) around the current step's real DOM
 * target, and a tooltip card with progress + Back/Next/Skip/Finish.
 *
 * Entrance uses the app's plain CSS keyframe utilities
 * (`animate-fade-in-up`, both fill-mode — tailwind.config.ts), the same
 * fix Part 4 §14 / Part 5 of HANDOVER.md applied everywhere else, not a
 * JS-gated Framer Motion mount animation with no fallback. The tooltip is
 * re-keyed on `stepIndex` (mirroring PageTransition.tsx's `key={pathname}`
 * pattern) so it replays its entrance on every step change without
 * depending on any exit-animation choreography.
 */
export function TourOverlay() {
  const { isOpen, stepIndex, steps, nextStep, backStep, skipTour, finishTour } = useTour();
  const { dict } = useLocale();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipSize, setTooltipSize] = useState(DEFAULT_TOOLTIP_SIZE);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const total = steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  useEffect(() => {
    if (!isOpen || !step) return;

    const selector = resolveSelector(step);
    if (!selector) {
      // Deferred via queueMicrotask — same fix as HANDOVER.md Part 2 §17.2
      // for "Calling setState synchronously within an effect" (the
      // react-hooks/set-state-in-effect rule); behavior is unchanged.
      queueMicrotask(() => setTargetRect(null));
      return;
    }

    let cancelled = false;

    function measure() {
      if (cancelled || !selector) return;
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    measure();
    // Re-measure after the sidebar's own open/close transition
    // (Sidebar.tsx, 300ms) settles — TourProvider may have just opened the
    // mobile drawer for this exact step, and the first measurement above
    // can land mid-transition.
    const settleTimer = setTimeout(measure, 340);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, step]);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    // Measured via getBoundingClientRect() (always the border box — the
    // panel's real on-screen footprint), not ResizeObserver's
    // `entry.contentRect` (the content box, which excludes this element's
    // own `p-5` padding and `border`). Tailwind's Preflight makes
    // `box-sizing: border-box` the default here, so `contentRect` under-
    // reports the panel's true width/height by ~42px (2 * (20px padding +
    // 1px border) on each axis) — the viewport-clamping math below was
    // computing its "safe" edge from a box ~42px smaller than the one
    // actually being clamped, which is exactly what let the real panel
    // hang off the edge of the screen despite the clamp "succeeding".
    function measureSize() {
      const node = tooltipRef.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      setTooltipSize({ width: box.width, height: box.height });
    }
    const observer = new ResizeObserver(measureSize);
    observer.observe(el);
    measureSize();
    return () => observer.disconnect();
  }, [stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") skipTour();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, skipTour]);

  if (!isOpen || !step) return null;

  const placement = computePlacement(targetRect, tooltipSize);
  const stepLabel = dict.tour.stepOf.replace("{current}", String(stepIndex + 1)).replace("{total}", String(total));

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={dict.tour.replayTitle}>
      {/* Click-outside-to-skip catcher, covering the full viewport either
          way. When there's a real target (targetRect), this stays
          invisible — the spotlight ring below is the *only* dimming layer
          in that case, via its own oversized box-shadow. Previously this
          button always painted its own flat bg-navy-950/70 over the whole
          viewport *underneath* the spotlight ring, including over the
          target's own screen position — the ring's box-shadow only adds
          darkness outside its own box, it doesn't (and can't) remove
          darkness a separate element already painted there, so the
          "spotlit" element was just as dimmed as everything else instead
          of reading crisp/bright. With no target (the welcome/center step,
          or a stale/unmatched nav href), this is the only dimming layer,
          so it keeps its own dim + blur — the same recipe Sidebar.tsx's
          own mobile backdrop already uses. */}
      <button
        type="button"
        aria-label={dict.tour.skip}
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          targetRect ? "bg-transparent" : "bg-navy-950/70 backdrop-blur-[2px]"
        )}
        onClick={skipTour}
      />

      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-[3px] ring-gold-400 transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - SPOTLIGHT_PADDING,
            left: targetRect.left - SPOTLIGHT_PADDING,
            width: targetRect.width + SPOTLIGHT_PADDING * 2,
            height: targetRect.height + SPOTLIGHT_PADDING * 2,
            // The 9999px spread is the whole spotlight technique: a
            // transparent box whose shadow is forced to fill every pixel
            // of the viewport *outside* its own bounds (box-shadow never
            // paints inside the box it's cast from), leaving the target
            // itself — now genuinely uncovered by anything — fully crisp
            // and bright. The second, tighter shadow adds a soft gold glow
            // right at the ring's edge so the highlighted element pops
            // rather than just having a hard-edged ring around it.
            boxShadow: "0 0 0 9999px rgba(11, 33, 56, 0.82), 0 0 0 6px rgba(230, 173, 63, 0.28)",
          }}
        />
      )}

      <div
        key={step.id}
        ref={tooltipRef}
        // max-h + overflow-y-auto is a backstop independent of the
        // position-clamping math above: on a short viewport (a phone in
        // landscape) with an unusually long translated step body, this
        // guarantees the panel itself can never be physically taller than
        // the viewport, by scrolling its own content instead — no clamp
        // can otherwise put a too-tall box fully on-screen, since there's
        // no valid position for one.
        className="animate-fade-in-up absolute w-[min(92vw,340px)] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-white/10 bg-navy-gradient p-5 text-white shadow-card-hover"
        style={placement}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gold-300">{stepLabel}</span>
          <button
            type="button"
            onClick={skipTour}
            aria-label={dict.tour.skip}
            className="rounded-full p-1 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="font-display text-lg font-semibold text-white">{step.title(dict)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-100">{step.body(dict)}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn("h-1.5 rounded-full transition-all duration-200", i === stepIndex ? "w-5 bg-gold-400" : "w-1.5 bg-white/25")}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={skipTour} className="text-sm font-medium text-navy-200 transition-colors hover:text-white">
            {dict.tour.skip}
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={backStep}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {dict.tour.back}
              </button>
            )}
            <button type="button" onClick={isLast ? finishTour : nextStep} className="btn-gold">
              {isLast ? dict.tour.finish : dict.tour.next}
              {!isLast && <ArrowRight className="h-4 w-4 rtl:rotate-180" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
