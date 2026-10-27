import { requireRole } from "@/lib/auth";
import { FeedbackForm } from "./FeedbackForm";
import { Card } from "@/components/ui/Card";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function FeedbackPage() {
  await requireRole("teacher", "student", "parent");
  const dict = await getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeUp>
        <h1 className="page-title">{dict.feedback.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.feedback.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <FeedbackForm />
        </Card>
      </FadeUp>
    </div>
  );
}
