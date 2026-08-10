"use client";

import { useState } from "react";
import { LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { signOutOtherSessionsAction } from "@/app/(dashboard)/settings/actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * "Sign out everywhere else." The Supabase Auth API version this project
 * uses doesn't expose a way to list or individually name other sessions
 * (no device/location info, no per-session revoke) — checked the installed
 * SDK types rather than assume. This is the honest available equivalent:
 * one action that invalidates every session except the one making the
 * request, via supabase.auth.signOut({ scope: "others" }).
 */
export function SignOutOtherSessionsButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean }>();
  const { dict } = useLocale();

  async function handleClick() {
    setPending(true);
    setResult(undefined);
    const res = await signOutOtherSessionsAction();
    setPending(false);
    setResult(res);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-navy-400">
        {dict.settings.sessionsDescription}
      </p>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && (
        <Alert tone="success">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" /> {dict.settings.signOutOtherSessionsDone}
          </span>
        </Alert>
      )}
      <Button variant="secondary" onClick={handleClick} loading={pending}>
        <LogOut className="h-4 w-4" />
        {dict.settings.signOutOtherSessions}
      </Button>
    </div>
  );
}
