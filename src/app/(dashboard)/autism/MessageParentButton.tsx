"use client";

import { useTransition } from "react";
import { startConversationAction } from "../messages/actions";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * No new server action for this — reuses startConversationAction directly
 * (src/app/(dashboard)/messages/actions.ts), same "call inside
 * startTransition, let it redirect" pattern messages/NewConversationForm.tsx
 * already uses for the identical "start a DM with this specific person"
 * shape, just without that form's person picker since the recipient here
 * is already known (the student's parent).
 */
export function MessageParentButton({ parentId, parentName }: { parentId: string; parentName: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <Button type="button" variant="secondary" loading={pending} onClick={() => startTransition(() => startConversationAction(parentId))}>
      {dict.autismSection.messageParent.replace("{name}", parentName)}
    </Button>
  );
}
