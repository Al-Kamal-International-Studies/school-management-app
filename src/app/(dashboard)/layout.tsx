import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { hasAkisAccess } from "@/lib/centers/hasAkisAccess";
import { listMyNotifications } from "@/lib/notifications/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Every security gate (2FA, forced password change, device, passkey nudge)
  // runs here, before the shell renders — see requireDashboardAccess().
  const profile = await requireDashboardAccess();

  const [akisAccess, notifications] = await Promise.all([hasAkisAccess(profile.id), listMyNotifications(profile.id)]);

  // Single-institution app (AKIS only, HANDOVER Part 37). Login already
  // refuses accounts without an AKIS grant; this also closes any session
  // that predates the AKET removal. A layout can't clear auth cookies, so
  // the /access-revoked route handler signs the session out and lands on
  // /login?error=no_access (rather than leaving a live session behind).
  if (!akisAccess) {
    redirect("/access-revoked");
  }

  return (
    <DashboardShell profile={profile} notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
