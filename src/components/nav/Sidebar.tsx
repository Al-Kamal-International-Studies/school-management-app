"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

interface NavItem {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", labelKey: "overview", icon: LayoutDashboard },
    { href: "/admin/users", labelKey: "users", icon: Users },
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

function isRtlDir() {
  return typeof document !== "undefined" && document.documentElement.dir === "rtl";
}

export function Sidebar({
  role,
  mobileOpen,
  onClose,
}: {
  role: UserRole;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const items = NAV_ITEMS[role];

  function renderItem(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <li key={item.href} className="relative">
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg bg-white/10"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <Link
          href={item.href}
          onClick={onClose}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:py-2.5",
            active ? "text-white" : "text-navy-200 hover:text-white"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-gold-400")} strokeWidth={2} />
          {dict.nav[item.labelKey]}
          {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
        </Link>
      </li>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col overflow-hidden bg-navy-gradient transition-transform duration-300 ease-out rtl:left-auto rtl:right-0",
          // Full-height regardless of content height, robust against the
          // parent flex row's ambiguous cross-size calculation (see
          // HANDOVER.md-style gotchas — `lg:static` + `h-full` was fragile).
          "lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-64 lg:!transform-none"
        )}
        style={{ transform: mobileOpen ? "translateX(0)" : isRtlDir() ? "translateX(100%)" : "translateX(-100%)" }}
      >
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="relative flex-1 space-y-1 overflow-y-auto p-3">{items.map(renderItem)}</ul>

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
