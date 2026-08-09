"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { Topbar } from "@/components/nav/Topbar";
import { PageTransition } from "@/components/nav/PageTransition";
import type { Profile } from "@/lib/types/database.types";
import type { ReactNode } from "react";

export function DashboardShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes. Adjusting state
  // during render (rather than in a useEffect) is the pattern React
  // recommends for "reset state when a prop changes" — see
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">
      <Sidebar role={profile.role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
