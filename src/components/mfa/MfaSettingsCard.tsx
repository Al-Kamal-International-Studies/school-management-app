"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { logMfaUnenrolledAction } from "@/app/mfa/actions";

/**
 * Admin-only MFA status + reset. "Reset" removes the current factor and
 * sends them straight to /mfa/setup to enroll a new one — Supabase's
 * unenroll() requires the session to already be at aal2 (see the SDK's own
 * doc comment on GoTrueMFAApi#unenroll), so this can't be used to disable
 * MFA without already having proven possession of the current factor.
 * There is no "just turn it off" option for admins — matches the
 * checklist's "MFA required for all admin accounts", not opt-in.
 */
export function MfaSettingsCard() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp?.[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  async function handleReset() {
    if (!factorId) return;
    setResetting(true);
    setError(undefined);

    const supabase = createClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

    if (unenrollError) {
      setResetting(false);
      setError(unenrollError.message);
      return;
    }

    await logMfaUnenrolledAction();
    router.push("/mfa/setup");
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-navy-400">Checking status…</p>;

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {factorId ? (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm text-navy-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
            Enabled
          </span>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)} loading={resetting}>
            Reset device
          </Button>
        </div>
      ) : (
        <span className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Not set up — you'll be asked to set it up on your next visit.
        </span>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset two-factor authentication?"
        confirmLabel="Reset"
        onConfirm={handleReset}
        pending={resetting}
      >
        This removes your current authenticator and immediately sends you to set up a new one — do this if you're switching
        devices or lost access to your authenticator app.
      </ConfirmDialog>
    </div>
  );
}
