"use client";

import { Button } from "@/components/ui/Button";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";

/**
 * Placeholder practice screen for lessons that haven't been written yet:
 * one task, "Press Done". Lesson authors replace the stub lesson (and stop
 * using this component) when they write the real practice.
 */
export default function StubPractice({ locale, dir, completedTasks, completeTask }: PracticeProps) {
  const done = completedTasks.has("done");
  return (
    <PracticeFrame locale={locale} dir={dir}>
      <p className="text-sm text-slate-600 dark:text-navy-200">
        {locale === "ar"
          ? "هذا درس تجريبي مؤقت. سيُستبدل بتدريب حقيقي قريبًا."
          : "This is a placeholder lesson. A real practice screen will replace it soon."}
      </p>
      <Button type="button" variant={done ? "secondary" : "primary"} onClick={() => completeTask("done")}>
        {locale === "ar" ? "تم" : "Done"}
      </Button>
    </PracticeFrame>
  );
}
