import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyTotpForm } from "@/components/mfa/VerifyTotpForm";
import { knownCenterFor } from "@/lib/centers/knownCenters";

/**
 * MFA challenge step for an admin whose session hasn't verified their
 * already-enrolled factor yet. Same "no requireRole() here" reasoning as
 * /mfa/setup — this IS the redirect target requireRole() sends them to.
 */
export default async function MfaVerifyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") redirect("/admin");
  // No enrolled factor at all — wrong page, needs first-time setup instead.
  if (data?.nextLevel !== "aal2") redirect("/mfa/setup");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factorId = factors?.totp?.[0]?.id;
  if (!factorId) redirect("/mfa/setup");

  // MFA happens post-authentication, so (unlike /login) the real profile —
  // and its real center — is already known here. Same pattern
  // /devices/manage and /force-password-change already use.
  const center = knownCenterFor(profile.center_id);

  return (
    <AuthShell center={center}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Verify it's you</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>
      <VerifyTotpForm factorId={factorId} />
    </AuthShell>
  );
}
