import { requireRole } from "@/lib/auth";
import { AdmissionForm } from "./AdmissionForm";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function NewAdmissionPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.admissions.newTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.admissions.newSubtitle}</p>
      </FadeUp>
      <FadeUp delay={0.05} className="card p-6">
        <AdmissionForm dict={dict} />
      </FadeUp>
    </div>
  );
}
