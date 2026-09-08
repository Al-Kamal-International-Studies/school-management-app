import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getIdCardData } from "@/lib/idcard/getIdCardData";
import { IdCardView } from "@/components/idcard/IdCardView";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function StudentIdCardPage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const data = await getIdCardData(me.id);
  if (!data) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.idCard.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.idCard.subtitleStudent}</p>
      </FadeUp>
      <FadeUp delay={0.06}>
        <IdCardView data={data} canEditPhoto dict={dict} />
      </FadeUp>
    </div>
  );
}
