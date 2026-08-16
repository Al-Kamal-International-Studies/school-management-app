"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  School,
  BookMarked,
  CalendarClock,
  BookOpen,
  Bot,
  MessageSquareText,
  Settings as SettingsIcon,
  ClipboardList,
  Megaphone,
  CalendarCheck,
  FileText,
  GraduationCap,
  FileQuestion,
  NotebookPen,
  PlaneTakeoff,
  CalendarDays,
  FolderOpen,
  History,
  MessagesSquare,
  KeyRound,
  ChevronLeft,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CenterLogo, CenterMark } from "@/components/auth/CenterLogo";
import { knownCenterFor } from "@/lib/centers/knownCenters";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { dirForLocale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

// Persists the desktop-only collapsed/expanded rail preference across
// sessions. Deliberately a plain localStorage flag (not the cookie+
// server-resolved pattern ThemeProvider uses) since this is a pure
// client-side layout preference with no SSR-rendered content depending on
// it. Read/written through a tiny external store (below) so the value can
// be surfaced via useSyncExternalStore — that's what lets the server/first
// client render both safely assume "expanded" (via getServerSnapshot,
// avoiding a hydration mismatch) while still picking up the real stored
// value right after mount, without reaching for a manual
// useEffect-that-calls-setState (which the project's lint config forbids —
// see react-hooks/set-state-in-effect).
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const collapsedListeners = new Set<() => void>();
let cachedCollapsed: boolean | null = null;

function readStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — fall
    // back to the default expanded rail.
    return false;
  }
}

function subscribeCollapsed(onStoreChange: () => void) {
  collapsedListeners.add(onStoreChange);
  return () => {
    collapsedListeners.delete(onStoreChange);
  };
}

function getCollapsedSnapshot(): boolean {
  if (cachedCollapsed === null) cachedCollapsed = readStoredCollapsed();
  return cachedCollapsed;
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function setCollapsedPreference(next: boolean) {
  cachedCollapsed = next;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  } catch {
    // ignore write failures (private browsing, storage disabled, etc.)
  }
  collapsedListeners.forEach((listener) => listener());
}

interface NavItem {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", labelKey: "overview", icon: LayoutDashboard },
    { href: "/admin/users", labelKey: "users", icon: Users },
    { href: "/admin/password-reset-requests", labelKey: "passwordResetRequests", icon: KeyRound },
    { href: "/admin/classes", labelKey: "classes", icon: School },
    { href: "/admin/subjects", labelKey: "subjects", icon: BookMarked },
    { href: "/admin/timetable", labelKey: "timetable", icon: CalendarClock },
    { href: "/admin/progress", labelKey: "progress", icon: ClipboardList },
    { href: "/admin/leave-requests", labelKey: "leave", icon: PlaneTakeoff },
    { href: "/admin/events", labelKey: "calendar", icon: CalendarDays },
    { href: "/admin/documents", labelKey: "documents", icon: FolderOpen },
    { href: "/admin/announcements", labelKey: "announcements", icon: Megaphone },
    { href: "/messages", labelKey: "messages", icon: MessagesSquare },
    { href: "/admin/feedback", labelKey: "feedback", icon: MessageSquareText },
    { href: "/admin/audit-log", labelKey: "auditLog", icon: History },
  ],
  teacher: [
    { href: "/teacher", labelKey: "myClasses", icon: BookOpen },
    { href: "/teacher/timetable", labelKey: "myTimetable", icon: CalendarClock },
    { href: "/teacher/attendance", labelKey: "attendance", icon: CalendarCheck },
    { href: "/teacher/assignments", labelKey: "assignments", icon: FileText },
    { href: "/teacher/exams", labelKey: "exams", icon: FileQuestion },
    { href: "/teacher/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/teacher/remarks", labelKey: "remarks", icon: NotebookPen },
    { href: "/teacher/progress", labelKey: "progress", icon: ClipboardList },
    { href: "/calendar", labelKey: "calendar", icon: CalendarDays },
    { href: "/documents", labelKey: "documents", icon: FolderOpen },
    { href: "/messages", labelKey: "messages", icon: MessagesSquare },
    { href: "/chatbot", labelKey: "helpAssistant", icon: Bot },
    { href: "/feedback", labelKey: "feedback", icon: MessageSquareText },
  ],
  student: [
    { href: "/student", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/student/timetable", labelKey: "myTimetable", icon: CalendarClock },
    { href: "/student/attendance", labelKey: "attendance", icon: CalendarCheck },
    { href: "/student/assignments", labelKey: "assignments", icon: FileText },
    { href: "/student/exams", labelKey: "exams", icon: FileQuestion },
    { href: "/student/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/student/leave", labelKey: "leave", icon: PlaneTakeoff },
    { href: "/calendar", labelKey: "calendar", icon: CalendarDays },
    { href: "/documents", labelKey: "documents", icon: FolderOpen },
    { href: "/messages", labelKey: "messages", icon: MessagesSquare },
    { href: "/chatbot", labelKey: "helpAssistant", icon: Bot },
    { href: "/feedback", labelKey: "feedback", icon: MessageSquareText },
  ],
  parent: [
    { href: "/parent", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/calendar", labelKey: "calendar", icon: CalendarDays },
    { href: "/documents", labelKey: "documents", icon: FolderOpen },
    { href: "/messages", labelKey: "messages", icon: MessagesSquare },
    { href: "/chatbot", labelKey: "helpAssistant", icon: Bot },
    { href: "/feedback", labelKey: "feedback", icon: MessageSquareText },
  ],
};

export function Sidebar({
  role,
  activeCenterId,
  mobileOpen,
  onClose,
}: {
  role: UserRole;
  activeCenterId: string;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { dict, locale } = useLocale();
  const isRtl = dirForLocale(locale) === "rtl";
  const items = NAV_ITEMS[role];
  // Which center's branding to show — the account's actual active center
  // (resolved by (dashboard)/layout.tsx from profile.center_id or, for a
  // multi-center account, the active_center_id cookie), not a hardcoded
  // AKIS assumption. See CenterLogo.tsx for the same resolution AuthShell
  // already applies pre-login.
  const center = knownCenterFor(activeCenterId);

  // Desktop-only icon-rail collapse. Server and first client (hydration)
  // render always see "expanded" via getCollapsedServerSnapshot, so there's
  // no hydration mismatch; React re-renders with the real stored value
  // right after mount. The width transition is briefly suppressed on that
  // first correction so restoring a previously-collapsed sidebar snaps
  // into place instead of visibly animating on every page load.
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);
  const [enableWidthTransition, setEnableWidthTransition] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnableWidthTransition(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Overlay-style nav scrollbar: `.nav-scrollbar` (globals.css) renders its
  // thumb invisible by default and fades it in only while `is-scrolling` is
  // present. That class is toggled here rather than through React state —
  // this fires on every scroll frame, and a plain classList mutation avoids
  // re-rendering Sidebar (which mounts on every authenticated page) on each
  // one. Listening for the native `scroll` event (not `wheel`/`touchmove`)
  // means every way of moving the list — mouse wheel, trackpad, touch drag,
  // dragging the scrollbar thumb itself, and keyboard scrolling (arrow keys
  // / Page Down / Space moving a focused nav link into view) — is covered
  // identically, since `scroll` fires for any scrollTop change regardless
  // of what caused it. The `nav-scrollbar` className on the <ul> below is a
  // static string, so React never rewrites the DOM's class attribute across
  // re-renders and this imperative toggle is safe to leave in place.
  const navListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = navListRef.current;
    if (!el) return;
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    function handleScroll() {
      el!.classList.add("is-scrolling");
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        el!.classList.remove("is-scrolling");
      }, 1000);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  function toggleCollapsed() {
    setCollapsedPreference(!collapsed);
  }

  function renderItem(item: NavItem) {
    // The root/index item for a role (e.g. admin's "Overview" -> /admin) is
    // a literal path-prefix of every other route in that role's nav (e.g.
    // /admin/users starts with /admin/), so it must only ever match on an
    // exact pathname — otherwise it and whatever page you actually navigate
    // to both light up at once. Every other item keeps the prefix behavior
    // so nested routes (e.g. /admin/users/[id]) still highlight correctly.
    const isRootItem = item.href === `/${role}`;
    const active = isRootItem ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const label = dict.nav[item.labelKey];
    return (
      <li key={item.href} className="relative">
        {/* Plain CSS fade-in, not Framer Motion's `layoutId` shared-layout
            spring (see this file's history) — the shared-layout "slide
            between items" morph isn't worth the ~134KB (44KB gzipped)
            framer-motion adds to the JS every dashboard page loads, since
            Sidebar sits inside DashboardShell and is mounted on every
            authenticated route. A cross-fade at the new position reads
            the same to users (still highlights the active item
            immediately) without shipping a full animation library for it.
            animate-fade-in is the same CSS keyframe already used
            app-wide — see FadeUp.tsx and tailwind.config.ts. */}
        {active && <div className="absolute inset-0 animate-fade-in rounded-lg bg-white/10" />}
        <Link
          href={item.href}
          onClick={onClose}
          aria-label={label}
          title={collapsed ? label : undefined}
          data-tour-nav={item.href}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:py-2.5",
            active ? "text-white" : "text-navy-200 hover:text-white",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-gold-400")} strokeWidth={2} />
          <span className={cn(collapsed && "lg:hidden")}>{label}</span>
          {active && <span className={cn("ms-auto h-1.5 w-1.5 rounded-full bg-gold-400", collapsed && "lg:hidden")} />}
        </Link>
      </li>
    );
  }

  return (
    <>
      {/* Mobile backdrop — always mounted, CSS opacity transition instead of
          Framer Motion's AnimatePresence (see renderItem above for why:
          same 134KB/44KB-gzipped framer-motion cost, paid on every
          dashboard page for a fade that a plain CSS transition does just
          as well for both the enter *and* exit, without needing JS to
          orchestrate the exit-before-unmount). `invisible` (not
          `hidden`/conditional render) keeps it in the DOM so opacity can
          transition on the way out too, and drops it from hit-testing and
          the accessibility tree while closed. */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "invisible opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col overflow-hidden bg-navy-gradient transition-transform duration-300 ease-out rtl:left-auto rtl:right-0",
          // Full-height regardless of content height, robust against the
          // parent flex row's ambiguous cross-size calculation (see
          // HANDOVER.md-style gotchas — `lg:static` + `h-full` was fragile).
          "lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:!transform-none",
          collapsed ? "lg:w-20" : "lg:w-64",
          // Width only ever changes at the lg breakpoint (the collapse
          // rail); suppressed on the first paint after mount (see the
          // enableWidthTransition effect above) so restoring a stored
          // "collapsed" preference snaps in instead of animating.
          enableWidthTransition ? "lg:transition-[width,transform] lg:duration-300 lg:ease-out" : "lg:transition-none"
        )}
        style={{ transform: mobileOpen ? "translateX(0)" : isRtl ? "translateX(100%)" : "translateX(-100%)" }}
      >
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div
          className={cn(
            "relative flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5",
            // Desktop-only padding trim to make room for the new toggle
            // button beside the logo — mobile (no lg: prefix) always keeps
            // the original px-5. Expanded needs only a little less (px-4)
            // for a comfortable gap between the wordmark and the button;
            // the collapsed lg:w-20 (80px) rail is far tighter and needs
            // px-2 so the crest mark and the button both fit without
            // touching. A single ternary (matching the lg:w-20/lg:w-64
            // pattern below) keeps exactly one lg:px-* class present at a
            // time — two competing lg:px-* utilities would leave the
            // winner to Tailwind's stylesheet-order, not this file's prop
            // order.
            collapsed ? "lg:px-2" : "lg:px-4"
          )}
        >
          <CenterLogo center={center} className={cn(collapsed && "lg:hidden")} />
          {collapsed && (
            // Fixed-size wrapper + unsized CenterMark, same pattern the Logo
            // component itself uses internally for the crest (see
            // ui/Logo.tsx's own `<div className="h-10 w-10 shrink-0">`) —
            // CenterMark's <img>/<LogoMark> hard-codes `h-full w-full`, and
            // since `cn` here is plain clsx (no tailwind-merge conflict
            // resolution, see lib/utils.ts), passing a fixed size directly
            // would just lose the cascade to its own h-full/w-full and
            // render at the parent's full size instead of 36px.
            <div className="hidden h-9 w-9 shrink-0 lg:block">
              <CenterMark center={center} />
            </div>
          )}
          <div className="flex shrink-0 items-center">
            {/* Desktop-only collapse toggle: icon-only, sitting in the
                header row to the right of the logo/crest. A plain flex
                row + justify-between (not absolute positioning) so it
                mirrors to the left of the logo under RTL automatically
                via the row's own direction-awareness, and so it can never
                overlap the logo — worst case on a too-narrow rail is
                clipping by the nav's overflow-hidden, not visual collision.
                Mobile keeps its own open/close drawer via mobileOpen/
                onClose and never sees this button (hidden below lg). */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? dict.nav.expandSidebar : dict.nav.collapseSidebar}
              title={collapsed ? dict.nav.expandSidebar : dict.nav.collapseSidebar}
              aria-pressed={collapsed}
              className="hidden shrink-0 rounded-lg p-1 text-navy-200 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex lg:items-center lg:justify-center"
            >
              <ChevronLeft
                className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isRtl !== collapsed && "rotate-180")}
                strokeWidth={2}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <ul ref={navListRef} className="nav-scrollbar relative flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(renderItem)}
        </ul>

        {/* Settings is pinned to the bottom for every role, outside the
            per-role scrollable nav list, so it's always reachable without
            scrolling. */}
        <div className="relative border-t border-white/10 p-3">
          <ul>{renderItem({ href: "/settings", labelKey: "settings", icon: SettingsIcon })}</ul>
        </div>
      </nav>
    </>
  );
}
