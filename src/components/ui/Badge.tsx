import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "amber" | "slate" | "navy" | "gold";

const toneClass: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/10 dark:text-navy-200 dark:ring-white/10",
  navy: "bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-200 dark:bg-navy-500/20 dark:text-navy-100 dark:ring-navy-400/30",
  gold: "bg-gold-50 text-gold-800 ring-1 ring-inset ring-gold-200 dark:bg-gold-500/15 dark:text-gold-300 dark:ring-gold-500/30",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", toneClass[tone])}>
      {children}
    </span>
  );
}
