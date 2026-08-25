import { requireRole } from "@/lib/auth";
import { AdmissionForm } from "./AdmissionForm";
import { listClassesForAdmissionSelect } from "../queries";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

// Account creation + PDF generation + email queuing (processAdmission, in
// ../actions.ts) runs synchronously inside createAdmissionAction before it
// redirects here-adjacent to /admin/admissions/[id] — several sequential
// network round-trips (two auth.admin.createUser calls, a storage upload, an
// email-outbox insert). Raised past Vercel's default Server Action timeout
// so a slow cold start can't leave an admission stuck at status='pending'
// with no error and no visible Retry option (see the [id] page's Retry
// button, now also shown for 'pending' rows, and the "GET route/maxDuration"
// docs at node_modules/next/dist/docs/.../maxDuration.md).
export const maxDuration = 60;

export default async function NewAdmissionPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const classes = await listClassesForAdmissionSelect();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.admissions.newTitle}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.admissions.newSubtitle}</p>
      </FadeUp>
      <FadeUp delay={0.05} className="card p-6">
        <AdmissionForm dict={dict} classes={classes} />
      </FadeUp>
    </div>
  );
}
