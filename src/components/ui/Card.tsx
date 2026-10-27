import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline, TrendDelta, type TrendDeltaProps } from "@/components/ui/Sparkline";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  // cn() is plain clsx (no tailwind-merge), so a caller-supplied p-* would
  // lose to a built-in p-6 on stylesheet order — skip the default instead.
  const hasPadding = /(^|\s)p-\d/.test(className ?? "");
  return <div className={cn("card", !hasPadding && "p-6", className)}>{children}</div>;
}

/**
 * A single figure with its label (DESIGN.md: "one hero number"). The value
 * is the content: serif, 32px, tabular figures. The label is a small grey
 * line above it, and the icon is a quiet marker in the corner, not a
 * coloured tile.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Chronological values (oldest first) for a small trend line under the value. */
  trend?: number[];
  /** Signed change vs. a comparison period, shown next to the value. */
  delta?: TrendDeltaProps;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-navy-400" strokeWidth={1.75} aria-hidden="true" />}
      </div>
      {/* The trend line sits in the value row, end-aligned, so a tile with
          a sparkline is exactly as tall as one without — a row of stat
          tiles always shares one height and one baseline. */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="tabular shrink-0 font-display text-[2rem] font-semibold leading-none text-navy-950 dark:text-white">{value}</p>
        {trend && trend.length > 1 && (
          <div className="min-w-0 max-w-24 flex-1">
            <Sparkline points={trend} height={32} width={96} marker={false} />
          </div>
        )}
      </div>
      {(delta || hint) && (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-navy-400">
          {delta && <TrendDelta {...delta} />}
          {hint}
        </p>
      )}
    </Card>
  );
}
