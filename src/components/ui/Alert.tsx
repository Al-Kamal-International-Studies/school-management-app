import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const toneClass: Record<Tone, string> = {
  error: "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  success: "bg-green-50 text-green-800 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div role="alert" className={cn("rounded-lg border px-4 py-3.5 text-sm leading-relaxed", toneClass[tone])}>
      {children}
    </div>
  );
}
