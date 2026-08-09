"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          setError("This reset link is invalid or has expired. Request a new one.");
        }
        setReady(true);
        window.history.replaceState(null, "", window.location.pathname);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          setError("This reset link is invalid or has expired. Request a new one.");
        }
        setReady(true);
      });
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/login"), 1500);
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Set a new password</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">Make it something you'll remember.</p>
      </div>

      {success ? (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Password updated. Redirecting to sign in…
          </span>
        </Alert>
      ) : !ready ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">Verifying your link…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <label htmlFor="password" className="label">
              New password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-navy-500" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm new password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-navy-500" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input pl-10"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            {submitting ? "Saving…" : "Save new password"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
