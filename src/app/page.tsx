import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(dashboardPathForRole(profile.role));
  }

  redirect("/login");
}
