import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { EnrollTotpForm } from "@/components/mfa/EnrollTotpForm";
import { knownCenterFor } from "@/lib/centers/knownCenters";

/**
 * Mandatory first-time MFA enrollment for admins. Reached only via
 * requireAdminMfaVerified() (lib/auth.ts) redirecting here — deliberately
 * does NOT call requireRole() itself (that would immediately redirect back
 * here again, an infinite loop). Does its own minimal, equivalent check.
 */
export default async function MfaSetupPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") redirect("/admin");
  // Already has a factor, just hasn't verified this session — wrong page.
  if (data?.nextLevel === "aal2") redirect("/mfa/verify");

  // MFA happens post-authentication, so (unlike /login) the real profile —
  // and its real center — is already known here. Same pattern
  // /devices/manage and /force-password-change already use.
  const center = knownCenterFor(profile.center_id);

  return (
    <AuthShell center={center}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
          Set up two-factor authentication
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">
          Admin accounts require this. Scan the code below with an authenticator app (Google Authenticator, Authy, 1Password,
          etc.) and enter the 6-digit code it shows to finish.
        </p>
      </div>
      <EnrollTotpForm />
    </AuthShell>
  );
}
