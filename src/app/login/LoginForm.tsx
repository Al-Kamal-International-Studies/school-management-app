"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { CelebrateOnHover } from "@/components/auth/CelebrateOnHover";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: LoginState = {};

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <CelebrateOnHover>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? dict.login.signingIn : dict.login.signIn}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </CelebrateOnHover>
  );
}

export function LoginForm({
  next,
  deactivated,
  dict,
}: {
  next?: string;
  deactivated?: boolean;
  dict: Dictionary;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {deactivated && <Alert tone="error">{dict.login.deactivated}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div>
        <label htmlFor="email" className="label">
          {dict.login.email}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3.5" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input pl-10 rtl:pl-3.5 rtl:pr-10"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">
          {dict.login.password}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3.5" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input pl-10 rtl:pl-3.5 rtl:pr-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-end text-sm">
        <Link href="/forgot-password" className="font-medium text-navy-600 transition-colors hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
          {dict.login.forgotPassword}
        </Link>
      </div>

      <SubmitButton dict={dict} />
    </form>
  );
}
