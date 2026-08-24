import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasskeySetupPrompt } from "./PasskeySetupPrompt";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { knownCenterFor } from "@/lib/centers/knownCenters";

/**
 * Reached via requireRole()'s requirePasskeyPromptResolved gate (lib/auth.ts)
 * — a one-time, skippable nudge to set up Face ID/fingerprint/Windows Hello
 * sign-in, shown once must_change_password/device-approval/MFA have all
 * already cleared. Deliberately does NOT call requireRole() itself (infinite
 * redirect loop) — same pattern as /mfa/setup, /force-password-change, and
 * /devices/manage.
 */
export default async function SetupPasskeyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.must_change_password) redirect("/force-password-change");

  const dashboardPath = dashboardPathForRole(profile.role);

  // Already resolved by the time this renders (dismissed elsewhere, or a
  // credential got registered from Settings in another tab) — no need to
  // make them click through. Same "already resolved" short-circuit
  // /devices/manage uses.
  if (profile.passkey_prompt_dismissed_at) redirect(dashboardPath);

  const supabase = await createClient();
  const { count } = await supabase.from("webauthn_credentials").select("id", { count: "exact", head: true }).eq("user_id", profile.id);
  if ((count ?? 0) > 0) redirect(dashboardPath);

  const dict = await getDictionary(await getLocale());
  // Same pattern /mfa/setup, /mfa/verify, /devices/manage, and
  // /force-password-change already use — the account (and its real center)
  // is already known here, so this shouldn't fall back to AuthShell's AKIS
  // default the way a pre-login page reasonably does. This was the one
  // post-login AuthShell call site that got missed when that pattern was
  // rolled out — found via live QA testing logging in as an AKET account.
  const center = knownCenterFor(profile.center_id);

  return (
    <AuthShell center={center}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.passkeySuggestion.title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-navy-400">{dict.passkeySuggestion.subtitle}</p>
      </div>
      <PasskeySetupPrompt dashboardPath={dashboardPath} />
    </AuthShell>
  );
}
