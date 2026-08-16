import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { getAccessibleCenters } from "@/lib/centers/getAccessibleCenters";
import { getActiveCenterId } from "@/lib/centers/activeCenterCookie";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (!profile.is_active) {
    redirect("/login?error=account_deactivated");
  }

  // Only ever fetched further/passed down when there's actually more than
  // one center to switch between — a single-center account (the overwhelming
  // majority) never triggers the extra query and never sees the switcher.
  const accessibleCenters = await getAccessibleCenters(profile.id);
  const activeCenterId =
    accessibleCenters.length > 1
      ? await getActiveCenterId(
          profile.center_id,
          accessibleCenters.map((c) => c.id)
        )
      : profile.center_id;

  return (
    <DashboardShell profile={profile} centers={accessibleCenters} activeCenterId={activeCenterId}>
      {children}
    </DashboardShell>
  );
}
