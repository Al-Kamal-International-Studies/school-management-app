"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "@/components/auth/AuthShell";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      {pending ? "Sending…" : "Send reset link"}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Reset your password</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">We'll email you a link to get back in.</p>
      </div>

      {state.success ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            If an account exists for that email, a password reset link is on its way.
          </span>
        </Alert>
      ) : (
        <form action={formAction} className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-navy-500" />
              <input id="email" name="email" type="email" autoComplete="email" required className="input pl-10" />
            </div>
          </div>
          <SubmitButton />
        </form>
      )}

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-navy-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </AuthShell>
  );
}
