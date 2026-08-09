import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card p-6", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="card-hover group relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-navy-300">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold text-navy-900 dark:text-white">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-navy-400">{hint}</p>}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition-colors duration-200 group-hover:bg-gold-gradient group-hover:text-navy-900 dark:bg-navy-800 dark:text-navy-200">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}
