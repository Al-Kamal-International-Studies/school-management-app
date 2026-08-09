"use client";

import { useTransition } from "react";
import { startConversationAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function NewConversationForm({ people }: { people: { id: string; full_name: string; role: string }[] }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  if (people.length === 0) return null;

  return (
    <form
      action={(formData) => {
        const otherId = formData.get("other_id");
        if (typeof otherId === "string" && otherId) startTransition(() => startConversationAction(otherId));
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <select name="other_id" defaultValue={people[0]?.id} className="input w-auto bg-white dark:bg-navy-900">
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name} ({p.role})
          </option>
        ))}
      </select>
      <Button type="submit" loading={pending}>
        {dict.messages.newMessage}
      </Button>
    </form>
  );
}
