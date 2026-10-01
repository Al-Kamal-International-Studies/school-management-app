import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { getAccessibleCenters } from "@/lib/centers/getAccessibleCenters";
import { getActiveCenterId } from "@/lib/centers/activeCenterCookie";
import { knownCenterFor } from "@/lib/centers/knownCenters";
import { listMyNotifications } from "@/lib/notifications/queries";
import { hasAutismAccess } from "@/lib/autism/hasAutismAccess";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (!profile.is_active) {
    redirect("/login?error=account_deactivated");
  }

  // These three are each read-only, independent of one another (none needs
  // another's result), and every request pays for all three regardless of
  // role — notifications and autism-access used to be awaited one after the
  // other, stacking their full round-trip latency in serial for no reason.
  // Running them together cuts that to the slowest of the three instead of
  // the sum of all three. getAccessibleCenters is only ever fetched further/
  // passed down when there's actually more than one center to switch
  // between — a single-center account (the overwhelming majority) never
  // triggers the extra query and never sees the switcher. It's also
  // cache()'d (see that file's own doc comment) so the many admin
  // pages/actions that call getActiveCenterForRequest() later in this same
  // request reuse this exact result instead of re-querying it.
  const [accessibleCenters, notifications, autismAccess] = await Promise.all([
    getAccessibleCenters(profile.id),
    listMyNotifications(profile.id),
    hasAutismAccess(profile),
  ]);

  const activeCenterId =
    accessibleCenters.length > 1
      ? await getActiveCenterId(
          profile.center_id,
          accessibleCenters.map((c) => c.id)
        )
      : profile.center_id;

  // Drives the `data-center` attribute (globals.css) that swaps the whole
  // navy/gold CSS-variable palette to AKET's — resolved from the SAME
  // validated activeCenterId this layout already computed above (not a raw
  // cookie read), so a single-center AKET account (no switcher, cookie
  // never written) still gets AKET's palette correctly, and a stale/tampered
  // cookie can never show the wrong center's colors for longer than the
  // real access check already allows. knownCenterFor() never throws and
  // falls back to AKIS for anything unrecognized.
  const centerCode = knownCenterFor(activeCenterId).short_code.toLowerCase();

  return (
    <DashboardShell
      profile={profile}
      centers={accessibleCenters}
      activeCenterId={activeCenterId}
      centerCode={centerCode}
      notifications={notifications}
      hasAutismAccess={autismAccess}
    >
      {children}
    </DashboardShell>
  );
}
