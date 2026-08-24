"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { retryAdmissionProcessingAction } from "../actions";
import type { Dictionary } from "@/lib/i18n/types";

export function RetryButton({ admissionId, dict }: { admissionId: string; dict: Dictionary }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function retry() {
    setError(null);
    startTransition(async () => {
      const result = await retryAdmissionProcessingAction(admissionId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="danger" onClick={retry} disabled={pending}>
        <RefreshCw className="h-4 w-4" />
        {pending ? dict.admissions.retrying : dict.admissions.retry}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
