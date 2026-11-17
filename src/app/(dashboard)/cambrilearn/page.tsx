import { ExternalLink, Globe, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FadeUp } from "@/components/motion/FadeUp";
import { CAMBRILEARN_DISPLAY_ADDRESS, CAMBRILEARN_LOGIN_URL } from "@/lib/cambrilearn";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function CambriLearnPage() {
  const dict = await getDictionary(await getLocale());
  const t = dict.cambrilearn;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader title={t.title} description={t.subtitle} />

      <FadeUp>
        {/* Browser-window look: a tab strip and an address bar over the content.
            Purely presentational; CambriLearn itself cannot be framed. */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-navy-700 dark:bg-navy-900">
          <div className="flex items-end gap-1 border-b border-slate-200 bg-slate-100 px-3 pt-2 dark:border-navy-700 dark:bg-navy-950">
            <div className="-mb-px flex min-w-0 max-w-[14rem] items-center gap-2 rounded-t-md border border-b-0 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 dark:border-navy-700 dark:bg-navy-900 dark:text-white">
              <Globe className="h-4 w-4 shrink-0 text-navy-700 dark:text-navy-100" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{t.tabLabel}</span>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-3 py-2 dark:border-navy-700 dark:bg-navy-900">
            <div
              role="group"
              aria-label={t.addressLabel}
              className="flex min-w-0 items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-600 dark:bg-navy-950 dark:text-navy-200"
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-navy-300" strokeWidth={1.75} aria-hidden="true" />
              <span dir="ltr" className="min-w-0 truncate text-start">
                {CAMBRILEARN_DISPLAY_ADDRESS}
              </span>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold text-navy-950 dark:text-white">{t.windowHeading}</h2>
              <p className="text-sm text-slate-600 dark:text-navy-300">{t.windowBody}</p>
            </div>

            <a
              href={CAMBRILEARN_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full sm:w-auto"
            >
              {t.openButton}
              <span className="sr-only"> {t.opensInNewTab}</span>
              <ExternalLink className="h-4 w-4 shrink-0 rtl:-scale-x-100" strokeWidth={1.75} aria-hidden="true" />
            </a>

            <div className="border-t border-slate-200 pt-5 dark:border-navy-700">
              <h3 className="section-title">{t.tipsHeading}</h3>
              <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-slate-600 marker:text-slate-400 dark:text-navy-300 dark:marker:text-navy-400">
                <li>{t.tipSignIn}</li>
                <li>{t.tipComeBack}</li>
              </ul>
            </div>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
