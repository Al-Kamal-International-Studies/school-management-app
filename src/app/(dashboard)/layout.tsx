import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { getAppCenterId } from "@/lib/centers/hasAkisAccess";
import { listMyNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Every security gate (2FA, forced password change, device, passkey nudge)
  // runs here, before the shell renders — see requireDashboardAccess().
  const profile = await requireDashboardAccess();

  const supabase = await createClient();
  const [appCenterId, notifications, { data: unreadMessages }, { data: canOverseeChats }] = await Promise.all([
    getAppCenterId(profile.id),
    listMyNotifications(profile.id),
    supabase.rpc("my_unread_total"),
    profile.role === "admin" ? supabase.rpc("is_chat_overseer", { p_user: profile.id }) : Promise.resolve({ data: false }),
  ]);

  // Single-institution app (AKIS only, HANDOVER Part 37). Login already
  // refuses accounts without an AKIS grant; this also closes any session
  // that predates the AKET removal. A layout can't clear auth cookies, so
  // the /access-revoked route handler signs the session out and lands on
  // /login?error=no_access (rather than leaving a live session behind).
  if (!appCenterId) {
    redirect("/access-revoked");
  }

  return (
    <DashboardShell profile={profile} notifications={notifications} unreadMessages={unreadMessages ?? 0} canOverseeChats={canOverseeChats === true}>
      {children}
    </DashboardShell>
  );
}
