"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { getDocumentUrlAction } from "@/lib/documents/getDocumentUrl";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DownloadButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { dict } = useLocale();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await getDocumentUrlAction(documentId);
            if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
            else setError(result.error ?? "Could not open the file.");
          })
        }
        className="flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900 disabled:opacity-50 dark:text-gold-300 dark:hover:text-gold-200"
      >
        <Download className="h-3.5 w-3.5" />
        {dict.documents.download}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
