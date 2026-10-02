"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * App-wide render-error boundary (catches anything thrown below the root
 * layout — see Next's error.tsx convention). Rendered inside the root
 * layout, so ThemeProvider/LocaleProvider are still mounted above it and
 * this gets the visitor's real theme/locale instead of a bare fallback.
 * "Back to dashboard" links to "/" rather than calling a server helper
 * directly (this is a Client Component) — the root page.tsx already
 * resolves that to the right role dashboard or /login.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center dark:bg-navy-950">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
        <AlertTriangle className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.errorPage.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-navy-400">{dict.errorPage.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="secondary">{dict.errorPage.backHome}</Button>
        </Link>
        <Button onClick={() => reset()}>{dict.errorPage.tryAgain}</Button>
      </div>
    </div>
  );
}
