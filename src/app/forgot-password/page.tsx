"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "@/components/auth/AuthShell";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ForgotPasswordState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      {pending ? pendingLabel : label}
      {!pending && <Send className="h-4 w-4" />}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);
  const { dict } = useLocale();

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.forgotPassword.title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-navy-400">{dict.forgotPassword.message}</p>
      </div>

      {state.success ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {dict.forgotPassword.requestSent}
          </span>
        </Alert>
      ) : (
        <form action={formAction} className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div>
            <label htmlFor="email" className="label">
              {dict.common.email}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-navy-500 rtl:left-auto rtl:right-3.5" />
              <input id="email" name="email" type="email" autoComplete="email" required className="input pl-10 rtl:pl-3.5 rtl:pr-10" />
            </div>
          </div>
          <SubmitButton label={dict.forgotPassword.sendRequest} pendingLabel={dict.forgotPassword.sending} />
        </form>
      )}

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        {dict.forgotPassword.backToSignIn}
      </Link>
    </AuthShell>
  );
}
