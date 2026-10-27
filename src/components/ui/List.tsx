import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dashboard building blocks (DESIGN.md):
 * - Section: an h2 heading a region, with an optional trailing text link.
 * - ListCard: ONE card holding a list of rows separated by hairlines —
 *   instead of a separate card per row ("cards are for objects").
 * - ListRow / ListRowLink: 44–56px rows — optional leading element, a title
 *   with an optional grey second line, and one trailing element.
 * - ListEmpty: the quiet one-line empty state inside a ListCard.
 */
export function Section({
  id,
  title,
  action,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="flex min-h-6 items-center justify-between gap-4">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Quiet trailing text link for a Section header ("View all"). */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded text-sm font-medium text-navy-700 hover:text-navy-950 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-200 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}

export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card overflow-hidden", className)}>{children}</div>;
}

export function ListRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-slate-100 dark:divide-navy-800">{children}</ul>;
}

export function ListEmpty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-slate-500 dark:text-navy-400">{children}</p>;
}

interface RowContentProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

function RowContent({ leading, title, subtitle, trailing }: RowContentProps) {
  return (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-navy-400">{subtitle}</span>}
      </span>
      {trailing}
    </>
  );
}

export function ListRow(props: RowContentProps) {
  return (
    <li className="flex min-h-14 items-center gap-4 px-5 py-3">
      <RowContent {...props} />
    </li>
  );
}

export function ListRowLink({ href, ...props }: RowContentProps & { href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-500 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]"
      >
        <RowContent {...props} />
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180 dark:text-navy-600" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Fixed-width leading date block for event-style rows: day over short month. */
export function DateBlock({ day, month }: { day: ReactNode; month: ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-navy-700">
      <span className="tabular text-[0.9375rem] font-semibold leading-none text-slate-900 dark:text-white">{day}</span>
      <span className="mt-0.5 text-[0.6875rem] font-medium leading-none text-slate-500 dark:text-navy-400">{month}</span>
    </span>
  );
}
