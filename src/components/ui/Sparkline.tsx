import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A minimal inline-SVG trend line for stat tiles — plain markup, zero JS,
 * server-rendered like every other hand-rolled graphic in this app
 * (ProgressRing, Robot.tsx). Single series only (a stat tile's own trend),
 * so per the dataviz stat-tile contract it needs no legend: the tile's
 * label already names what's plotted, and the value/delta text next to it
 * already carries the numbers — the line is reinforcement, not the only
 * source of the data.
 *
 * Always rendered `dir="ltr"`: the points are chronological (oldest to
 * newest, left to right) and stay that way regardless of the page's
 * reading direction, the same convention this app already uses for dates
 * and numbers in the Arabic locale.
 */
export function Sparkline({
  points,
  height = 36,
  className,
}: {
  /** Chronological values, oldest first. Fewer than 2 points renders nothing. */
  points: number[];
  height?: number;
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 200; // fixed viewBox unit; the <svg> itself stretches via width="100%"
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 5;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - padY - ((p - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1]!;

  return (
    // `dir` isn't in React's SVGProps typings even though it's a valid SVG
    // attribute, so it's set on this wrapper div instead of the <svg> —
    // same effect (an ltr-only subtree), no `as` cast needed.
    <div dir="ltr" className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-hidden="true">
        <path d={areaPath} className="fill-navy-500/10 dark:fill-navy-300/10" />
        <path
          d={linePath}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-navy-400 dark:stroke-navy-300"
        />
        {/* Current-period marker in the accent hue, with a surface-color ring
            so it stays legible where it lands on the line. gold-600/gold-300
            (not the brand's default gold-500) — validated via the dataviz
            skill's palette script against each mode's card surface
            (#fcfcfb light / #0f2131 dark): gold-500 fell under the 3:1
            contrast floor against the light surface, both shades clear it. */}
        <circle cx={lastX} cy={lastY} r={4} strokeWidth={2} className="fill-gold-600 stroke-white dark:fill-gold-300 dark:stroke-navy-900" />
      </svg>
    </div>
  );
}

export interface TrendDeltaProps {
  /** Signed change vs. the comparison period. `null` when there's not enough data yet. */
  value: number | null;
  /** Whether an increase is the good outcome (attendance, scores) or the bad one (pending items). */
  goodDirection?: "up" | "down";
  suffix?: string;
  precision?: number;
  className?: string;
}

/**
 * Signed delta text for a stat tile: colored by whether the direction of
 * change is the good outcome for that metric, with a matching up/down/flat
 * icon. Text never carries the sparkline's line color (per the dataviz
 * mark-anatomy rule that text wears text/status tokens, not series hues) —
 * this uses the app's existing status colors (emerald/red), the same ones
 * Badge already uses for green/red tones.
 */
export function TrendDelta({ value, goodDirection = "up", suffix = "%", precision = 1, className }: TrendDeltaProps) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={cn("inline-flex items-center text-xs font-medium text-slate-400 dark:text-navy-500", className)}>—</span>;
  }

  const rounded = Math.round(value * 10 ** precision) / 10 ** precision;

  if (rounded === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-navy-400", className)}>
        <Minus className="h-3.5 w-3.5" />
        {rounded.toFixed(precision)}
        {suffix}
      </span>
    );
  }

  const isUp = rounded > 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {isUp ? "+" : ""}
      {rounded.toFixed(precision)}
      {suffix}
    </span>
  );
}
