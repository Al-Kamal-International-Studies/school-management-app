"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { logMfaEnrolledAction } from "@/app/mfa/actions";

type EnrollState =
  | { step: "loading" }
  | { step: "error"; message: string }
  | { step: "scan"; factorId: string; qrCode: string; secret: string }
  | { step: "done" };

export function EnrollTotpForm() {
  const router = useRouter();
  const [state, setState] = useState<EnrollState>({ step: "loading" });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.enroll({ factorType: "totp" }).then(({ data, error }) => {
      if (error || !data) {
        setState({ step: "error", message: error?.message ?? "Could not start MFA setup." });
        return;
      }
      setState({ step: "scan", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    });
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (state.step !== "scan") return;
    setVerifying(true);
    setVerifyError(undefined);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: state.factorId, code: code.trim() });

    if (error) {
      setVerifying(false);
      setVerifyError(error.message);
      return;
    }

    await logMfaEnrolledAction();
    setState({ step: "done" });
    router.replace("/admin");
    router.refresh();
  }

  function copySecret() {
    if (state.step !== "scan") return;
    navigator.clipboard.writeText(state.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (state.step === "loading") {
    return <p className="text-sm text-slate-500 dark:text-navy-400">Preparing your setup code…</p>;
  }

  if (state.step === "error") {
    return <Alert tone="error">{state.message}</Alert>;
  }

  if (state.step === "done") {
    return (
      <Alert tone="success">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Two-factor authentication enabled. Redirecting…
        </span>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {/* The QR code is an SVG returned directly by Supabase's own Auth API
          in response to our own enroll() call — not user-supplied content —
          so rendering it via dangerouslySetInnerHTML here is safe. This is
          the one deliberate exception to this app's normal no-raw-HTML rule. */}
      <div
        className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3 dark:border-navy-700"
        dangerouslySetInnerHTML={{ __html: state.qrCode }}
      />

      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-navy-400">Can't scan? Enter this code manually:</p>
        <button
          type="button"
          onClick={copySecret}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left font-mono text-xs text-navy-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
        >
          <span className="truncate">{state.secret}</span>
          {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        </button>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        {verifyError && <Alert tone="error">{verifyError}</Alert>}
        <div>
          <label htmlFor="code" className="label">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input text-center tracking-[0.5em]"
            placeholder="000000"
          />
        </div>
        <Button type="submit" className="w-full" loading={verifying} disabled={code.length !== 6}>
          {verifying ? "Verifying…" : "Verify & enable"}
        </Button>
      </form>
    </div>
  );
}
