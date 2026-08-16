import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForcePasswordChangeForm } from "./ForcePasswordChangeForm";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { MIN_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH_ADMIN } from "@/lib/security/password";
import { knownCenterFor } from "@/lib/centers/knownCenters";

/**
 * Mandatory password change after signing in with a temp/admin-set
 * password. Reached only via requireRole()'s must_change_password gate
 * (lib/auth.ts) — deliberately does NOT call requireRole() itself (that
 * would redirect back here again). Does its own minimal, equivalent check,
 * same pattern as /mfa/setup.
 */
export default async function ForcePasswordChangePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.must_change_password) redirect(dashboardPathForRole(profile.role));

  const dict = await getDictionary(await getLocale());
  const minLength = profile.role === "admin" ? MIN_PASSWORD_LENGTH_ADMIN : MIN_PASSWORD_LENGTH;
  const center = knownCenterFor(profile.center_id);

  return (
    <AuthShell center={center}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.forcePasswordChange.title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-navy-400">{dict.forcePasswordChange.message}</p>
      </div>
      <ForcePasswordChangeForm minLength={minLength} />
    </AuthShell>
  );
}
