import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-navy-800">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 dark:bg-white/[0.03]">{children}</thead>;
}

// Sentence-case column labels in quiet grey (DESIGN.md) — hierarchy comes
// from type weight and colour, not shouting capitals.
export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-slate-500 dark:text-navy-300 rtl:text-right"
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children?: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white dark:divide-navy-800 dark:bg-navy-900">{children}</tbody>;
}

// py-3.5 + a 20px line = 48px rows, inside the 44–56px row band.
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 align-middle text-slate-700 dark:text-navy-100 ${className ?? ""}`}>{children}</td>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-400">
        <Inbox className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-navy-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-navy-400">{description}</p>}
    </div>
  );
}
