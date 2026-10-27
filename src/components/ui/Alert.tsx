import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info" | "warning";

const toneClass: Record<Tone, string> = {
  error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/30",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30",
  // Info uses the institution's own navy rather than a separate blue, so
  // the palette stays ink + greys + the three status colours.
  info: "bg-navy-50 text-navy-900 border-navy-200 dark:bg-navy-500/15 dark:text-navy-100 dark:border-navy-400/30",
  warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div role="alert" className={cn("rounded-lg border px-4 py-3.5 text-sm leading-relaxed", toneClass[tone])}>
      {children}
    </div>
  );
}
