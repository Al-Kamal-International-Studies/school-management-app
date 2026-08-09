"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Client-side CSV export — builds the file entirely in the browser and
 * triggers a download via a Blob URL. No server round-trip, no PDF/export
 * library or paid API involved.
 */
export function ExportCsvButton<T extends Record<string, unknown>>({
  rows,
  columns,
  filename,
  label = "Export CSV",
}: {
  rows: T[];
  columns: { key: keyof T; header: string }[];
  filename: string;
  label?: string;
}) {
  function handleExport() {
    const escape = (value: unknown) => {
      const str = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = columns.map((c) => escape(c.header)).join(",");
    const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
    const csv = [header, ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
