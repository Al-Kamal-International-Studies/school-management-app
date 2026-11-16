import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of a dashboard screen (DESIGN.md): an optional small grey eyebrow
 * line (e.g. today's date), the page's one serif h1, an optional grey
 * description, and at most one action aligned to the end. Replaces the old
 * WelcomeRobot mascot + speech-bubble header.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="page-title">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
