"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAdmissionPdfUrlAction } from "@/lib/admissions/getAdmissionPdfUrl";
import type { Dictionary } from "@/lib/i18n/types";

export function DownloadPdfButton({ admissionId, dict }: { admissionId: string; dict: Dictionary }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function download() {
    setError(null);
    startTransition(async () => {
      const result = await getAdmissionPdfUrlAction(admissionId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={download} disabled={pending}>
        <Download className="h-4 w-4" />
        {pending ? dict.admissions.downloading : dict.admissions.downloadPdf}
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
