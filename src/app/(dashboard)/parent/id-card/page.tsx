import { requireRole } from "@/lib/auth";
import { listMyChildren } from "../queries";
import { getIdCardData } from "@/lib/idcard/getIdCardData";
import { canEditIdCardPhoto } from "@/lib/idcard/authorizeIdCardAccess";
import { IdCardView } from "@/components/idcard/IdCardView";
import { Alert } from "@/components/ui/Alert";
import { FadeUp } from "@/components/motion/FadeUp";
import { initials } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ParentIdCardPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const me = await requireRole("parent");
  const dict = await getDictionary(await getLocale());

  const children = await listMyChildren(me.id);
  const { child: childParam } = await searchParams;
  const activeChild = children.find((c) => c.id === childParam) ?? children[0];

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-xl">
        <FadeUp>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.idCard.title}</h1>
        </FadeUp>
        <FadeUp delay={0.05} className="mt-4">
          <Alert tone="info">{dict.parent.noChildren}</Alert>
        </FadeUp>
      </div>
    );
  }

  const data = await getIdCardData(activeChild.id);
  if (!data) {
    return (
      <div className="mx-auto max-w-xl">
        <FadeUp delay={0.05} className="mt-4">
          <Alert tone="error">{dict.idCard.notFound}</Alert>
        </FadeUp>
      </div>
    );
  }

  const canEditPhoto = await canEditIdCardPhoto(me, activeChild.id);

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.idCard.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.idCard.subtitleParent}</p>
        </div>
        {children.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <a
                key={c.id}
                href={`/parent/id-card?child=${c.id}`}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  c.id === activeChild.id
                    ? "bg-navy-800 text-white dark:bg-navy-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {initials(c.full_name)}
                </span>
                {c.full_name}
              </a>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.06}>
        <IdCardView data={data} canEditPhoto={canEditPhoto} dict={dict} />
      </FadeUp>
    </div>
  );
}
