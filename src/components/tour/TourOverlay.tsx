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

function computePlacement(rect: Rect | null, size: { width: number; height: number }): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return { top: Math.round(vh / 2), left: Math.round(vw / 2), transform: "translate(-50%, -50%)" };
  }

  const spaceRight = vw - (rect.left + rect.width);
  const spaceLeft = rect.left;
  const spaceBelow = vh - (rect.top + rect.height);

  let top: number;
  let left: number;

  if (spaceRight >= size.width + VIEWPORT_MARGIN || spaceLeft >= size.width + VIEWPORT_MARGIN) {
    const placeRight = spaceRight >= spaceLeft;
    left = placeRight ? rect.left + rect.width + VIEWPORT_MARGIN : rect.left - size.width - VIEWPORT_MARGIN;
    top = rect.top + rect.height / 2 - size.height / 2;
  } else {
    left = rect.left + rect.width / 2 - size.width / 2;
    top = spaceBelow >= size.height + VIEWPORT_MARGIN ? rect.top + rect.height + VIEWPORT_MARGIN : rect.top - size.height - VIEWPORT_MARGIN;
  }

  left = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, vw - size.width - VIEWPORT_MARGIN));
  top = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, vh - size.height - VIEWPORT_MARGIN));

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
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setTooltipSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
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
      <button
        type="button"
        aria-label={dict.tour.skip}
        className="absolute inset-0 bg-navy-950/70 transition-opacity duration-200"
        onClick={skipTour}
      />

      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-gold-400 transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - SPOTLIGHT_PADDING,
            left: targetRect.left - SPOTLIGHT_PADDING,
            width: targetRect.width + SPOTLIGHT_PADDING * 2,
            height: targetRect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(11, 33, 56, 0.72)",
          }}
        />
      )}

      <div
        key={step.id}
        ref={tooltipRef}
        className="animate-fade-in-up absolute w-[min(92vw,340px)] rounded-2xl border border-white/10 bg-navy-gradient p-5 text-white shadow-card-hover"
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
