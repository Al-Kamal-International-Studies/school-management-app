import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { canViewIdCard } from "@/lib/idcard/authorizeIdCardAccess";
import { getIdCardData } from "@/lib/idcard/getIdCardData";
import { IdCardView } from "@/components/idcard/IdCardView";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/** Teachers can VIEW and DOWNLOAD a student's card, never edit the photo —
 * see IdCardView's canEditPhoto={false} below and
 * canEditIdCardPhoto's own doc comment for why (Muhammad's explicit
 * instruction, chat, 2026-09-08). */
export default async function TeacherIdCardDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const me = await requireRole("teacher");
  const { studentId } = await params;
  const dict = await getDictionary(await getLocale());

  const allowed = await canViewIdCard(me, studentId);
  if (!allowed) notFound();

  const data = await getIdCardData(studentId);
  if (!data) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <Link href="/teacher/id-cards" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-gold-300">
          <ChevronLeft className="h-4 w-4" />
          {dict.idCard.backToList}
        </Link>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{data.fullName}</h1>
      </FadeUp>
      <FadeUp delay={0.06}>
        <IdCardView data={data} canEditPhoto={false} dict={dict} />
      </FadeUp>
    </div>
  );
}
