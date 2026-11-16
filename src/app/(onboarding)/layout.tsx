import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth";
import { getAppCenterId } from "@/lib/centers/hasAkisAccess";

/**
 * The full-screen onboarding flow lives beside the (dashboard) group so it
 * renders without the sidebar and top bar. It runs exactly the gates the
 * dashboard layout runs, in the same order, BEFORE anything renders:
 * must-change-password, device cap, admin MFA, passkey nudge
 * (requireDashboardAccess) and the AKIS access check.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireDashboardAccess();

  const appCenterId = await getAppCenterId(profile.id);
  if (!appCenterId) {
    redirect("/access-revoked");
  }

  return <>{children}</>;
}
