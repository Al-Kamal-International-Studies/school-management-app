import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "amber" | "slate" | "navy" | "gold";

// Each colour carries exactly one meaning (DESIGN.md): green = done/present/
// approved, red = failed/absent/rejected, amber = pending/needs attention,
// navy = the institution's own categories, slate = neutral. "gold" is kept
// as a tone name for existing call sites but renders as a warm neutral —
// gold is reserved for the selected state in navigation.
const toneClass: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  red: "bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
  slate: "bg-slate-50 text-slate-700 ring-slate-500/20 dark:bg-white/5 dark:text-navy-200 dark:ring-white/10",
  navy: "bg-navy-50 text-navy-800 ring-navy-600/20 dark:bg-navy-500/15 dark:text-navy-100 dark:ring-navy-300/25",
  gold: "bg-gold-50 text-gold-900 ring-gold-700/20 dark:bg-gold-500/10 dark:text-gold-200 dark:ring-gold-400/25",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize leading-5 ring-1 ring-inset",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
