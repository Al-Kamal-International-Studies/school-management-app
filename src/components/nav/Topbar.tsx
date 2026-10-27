import Link from "next/link";
import { Menu } from "lucide-react";
import { initials } from "@/lib/utils";
import { CenterSwitcher } from "@/components/nav/CenterSwitcher";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { SignOutForm } from "@/components/nav/SignOutForm";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { displayTitle } from "@/lib/i18n/labels";
import type { Center, Notification, Profile } from "@/lib/types/database.types";

export function Topbar({
  profile,
  centers,
  activeCenterId,
  notifications,
  onMenuClick,
}: {
  profile: Profile;
  centers: Center[];
  activeCenterId: string;
  notifications: Notification[];
  onMenuClick: () => void;
}) {
  const { dict } = useLocale();
  const roleText = displayTitle(dict, profile);
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-navy-800 dark:bg-navy-950 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ms-2 flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
        aria-label={dict.common.openMenu}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-1.5 sm:gap-3">
        <CenterSwitcher centers={centers} activeCenterId={activeCenterId} />
        <NotificationBell notifications={notifications} />
        <Link
          href="/profile"
          aria-label={`${profile.full_name}, ${roleText}`}
          className="flex h-11 items-center gap-2.5 rounded-md ps-1 pe-1 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:hover:bg-white/10 sm:pe-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-xs font-medium text-white dark:bg-navy-700">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              initials(profile.full_name)
            )}
          </div>
          {/* Name with the role as a grey second line (DESIGN.md) — replaces the
              separate coloured role pill that used to sit beside it. */}
          <span className="hidden min-w-0 flex-col text-start leading-tight sm:flex">
            <span className="max-w-[12rem] truncate text-sm font-medium text-slate-900 dark:text-white">{profile.full_name}</span>
            <span className="max-w-[12rem] truncate text-xs text-slate-500 dark:text-navy-400">{roleText}</span>
          </span>
        </Link>
        <SignOutForm label={dict.common.signOut} />
      </div>
    </header>
  );
}
