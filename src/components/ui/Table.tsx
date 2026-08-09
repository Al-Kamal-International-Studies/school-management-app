import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-navy-800">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/80 dark:bg-white/5">{children}</thead>;
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-navy-300 rtl:text-right"
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children?: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white dark:divide-navy-800 dark:bg-navy-900">{children}</tbody>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-slate-700 dark:text-navy-100 ${className ?? ""}`}>{children}</td>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-400 dark:bg-navy-800 dark:text-navy-400">
        <Inbox className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-navy-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-navy-400">{description}</p>}
    </div>
  );
}
