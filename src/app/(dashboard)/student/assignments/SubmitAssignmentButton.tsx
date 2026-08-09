"use client";

import { useTransition } from "react";
import { submitAssignmentAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SubmitAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <Button variant="secondary" loading={pending} onClick={() => startTransition(() => submitAssignmentAction(assignmentId))}>
      {dict.assignments.markSubmitted}
    </Button>
  );
}
