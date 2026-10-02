import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/getDictionary";

/**
 * App-wide 404. Renders inside the root layout (ThemeProvider/LocaleProvider
 * stay mounted), so it picks up the visitor's actual theme/locale instead of
 * falling back to Next's bare default page. "Back to dashboard" resolves to
 * the signed-in user's own role dashboard (same helper the root page.tsx and
 * every role guard use) rather than a hardcoded path, so it's never a dead
 * end regardless of who hits a bad/stale link.
 */
export default async function NotFound() {
  const [locale, profile] = await Promise.all([getLocale(), getCurrentProfile()]);
  const dict = await getDictionary(locale);
  const backHref = profile ? dashboardPathForRole(profile.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center dark:bg-navy-950">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-400 dark:bg-navy-800 dark:text-navy-400">
        <SearchX className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.notFound.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-navy-400">{dict.notFound.description}</p>
      </div>
      <Link href={backHref}>
        <Button>{dict.notFound.backHome}</Button>
      </Link>
    </div>
  );
}
