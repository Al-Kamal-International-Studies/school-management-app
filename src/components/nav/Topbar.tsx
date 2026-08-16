import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { signOutAction } from "@/app/logout/actions";
import { initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CenterSwitcher } from "@/components/nav/CenterSwitcher";
import type { Center, Profile } from "@/lib/types/database.types";

const ROLE_TONE = {
  admin: "navy",
  teacher: "green",
  student: "gold",
  parent: "slate",
} as const;

export function Topbar({
  profile,
  centers,
  activeCenterId,
  onMenuClick,
}: {
  profile: Profile;
  centers: Center[];
  activeCenterId: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-sm dark:border-navy-800 dark:bg-navy-950/80 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 sm:gap-4">
        <CenterSwitcher centers={centers} activeCenterId={activeCenterId} />
        <Badge tone={ROLE_TONE[profile.role]}>
          <span className="hidden sm:inline">{profile.title || profile.role}</span>
          <span className="sm:hidden">{(profile.title || profile.role)[0]?.toUpperCase()}</span>
        </Badge>
        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-full py-1 ps-1 pe-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 sm:pe-3"
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy-gradient text-xs font-semibold text-white ring-2 ring-white dark:ring-navy-800">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              initials(profile.full_name)
            )}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 dark:text-navy-100 sm:inline">{profile.full_name}</span>
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-navy-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
