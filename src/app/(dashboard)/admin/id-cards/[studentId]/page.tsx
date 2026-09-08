import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { canViewIdCard, canEditIdCardPhoto } from "@/lib/idcard/authorizeIdCardAccess";
import { getIdCardData } from "@/lib/idcard/getIdCardData";
import { IdCardView } from "@/components/idcard/IdCardView";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AdminIdCardDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const me = await requireRole("admin");
  const { studentId } = await params;
  const dict = await getDictionary(await getLocale());

  // canViewIdCard's admin branch checks profile_center_access (Part 15's
  // established center-scoping boundary) — a direct link to a student
  // outside every accessible center 404s, same as every other
  // center-scoped admin surface in this app.
  const allowed = await canViewIdCard(me, studentId);
  if (!allowed) notFound();

  const data = await getIdCardData(studentId);
  if (!data) notFound();

  const canEditPhoto = await canEditIdCardPhoto(me, studentId);

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <Link href="/admin/id-cards" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-gold-300">
          <ChevronLeft className="h-4 w-4" />
          {dict.idCard.backToList}
        </Link>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{data.fullName}</h1>
      </FadeUp>
      <FadeUp delay={0.06}>
        <IdCardView data={data} canEditPhoto={canEditPhoto} dict={dict} />
      </FadeUp>
    </div>
  );
}
