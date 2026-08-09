"use client";

import { useTransition } from "react";
import { setFeedbackStatusAction } from "./actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { FeedbackStatus } from "@/lib/types/database.types";

export function StatusSelect({ id, status }: { id: string; status: FeedbackStatus }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => startTransition(() => setFeedbackStatusAction(id, e.target.value as FeedbackStatus))}
      className="input w-auto bg-white py-1.5 text-xs dark:bg-navy-900"
    >
      <option value="new">{dict.feedback.statusNew}</option>
      <option value="reviewed">{dict.feedback.statusReviewed}</option>
      <option value="resolved">{dict.feedback.statusResolved}</option>
    </select>
  );
}
