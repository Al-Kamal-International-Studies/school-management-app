import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DashboardShell } from "@/components/nav/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (!profile.is_active) {
    redirect("/login?error=account_deactivated");
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
