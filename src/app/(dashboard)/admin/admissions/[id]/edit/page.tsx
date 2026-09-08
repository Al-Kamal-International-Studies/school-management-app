import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdmission, listClassesForAdmissionSelect } from "../../queries";
import { AdmissionForm } from "../../new/AdmissionForm";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/**
 * Lets an admin correct an admission's own saved intake data — the "no way
 * to fix a mistake after submitting" gap (Muhammad, chat, 2026-09-08):
 * forgetting a parent email fails processing with the row stuck at
 * 'failed' and no way to add the missing field, only Retry (which fails
 * again for the same reason) or Delete (loses everything). Reuses the exact
 * same AdmissionForm as /admin/admissions/new, in edit mode — see
 * updateAdmissionAction's own doc comment in ../../actions.ts for exactly
 * what editing does and doesn't touch (never re-runs processAdmission
 * itself, never retroactively changes an already-created account).
 */
export default async function EditAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const [admission, classes, dict] = await Promise.all([getAdmission(id), listClassesForAdmissionSelect(), getDictionary(await getLocale())]);
  if (!admission) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.admissions.editTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.admissions.editSubtitle}</p>
      </FadeUp>
      <FadeUp delay={0.05} className="card p-6">
        <AdmissionForm dict={dict} classes={classes} admission={admission} />
      </FadeUp>
    </div>
  );
}
