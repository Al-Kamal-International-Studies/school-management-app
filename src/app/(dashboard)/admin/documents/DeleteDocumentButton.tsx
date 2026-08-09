"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDocumentAction } from "./actions";

export function DeleteDocumentButton({ id, filePath }: { id: string; filePath: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this document?")) startTransition(() => deleteDocumentAction(id, filePath));
      }}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-navy-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      aria-label="Delete document"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
