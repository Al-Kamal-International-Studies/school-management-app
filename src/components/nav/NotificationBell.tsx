"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Megaphone, FileText, FileQuestion, Hash, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";
import type { Notification } from "@/lib/types/database.types";

const TYPE_ICON: Record<string, typeof Bell> = {
  message: MessageSquare,
  class_chat: Hash,
  announcement: Megaphone,
  assignment: FileText,
  exam: FileQuestion,
};

/**
 * The Topbar bell — a real in-app notification inbox, not just a push
 * toast. Every producer in the app (DMs, Class Chat, announcements,
 * assignments, exams — see lib/notifications/notify.ts) writes here, so
 * this is the one place a user can catch up on everything they missed,
 * with each entry deep-linking to the specific thing it's about.
 *
 * Deliberately reads straight from the `notifications` prop rather than
 * mirroring it into local state — (dashboard)/layout.tsx re-fetches it on
 * every navigation, and `markAllNotificationsReadAction`'s
 * `revalidatePath("/", "layout")` makes the *same* fresh-prop mechanism
 * pick up a "mark all read" click without a full page reload. One piece of
 * real local UI state: whether the dropdown is open.
 */
export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const { dict, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleEntryClick(n: Notification) {
    if (!n.read_at) startTransition(() => void markNotificationReadAction(n.id));
    setOpen(false);
  }

  function handleMarkAllRead() {
    startTransition(() => void markAllNotificationsReadAction());
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={dict.notifications.title}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200",
          open
            ? "border-gold-400 bg-white shadow-card ring-2 ring-gold-400/25 dark:bg-navy-800"
            : "border-slate-200/70 bg-white/70 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card dark:border-navy-700 dark:bg-navy-900/50 dark:hover:border-navy-500"
        )}
      >
        <Bell className="h-4 w-4 text-slate-500 dark:text-navy-300" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-navy-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in-up absolute end-0 z-20 mt-2 w-80 max-w-[92vw] origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover dark:border-navy-700 dark:bg-navy-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-navy-800">
            <span className="text-sm font-semibold text-navy-900 dark:text-white">{dict.notifications.title}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-600 transition-colors hover:bg-navy-50 dark:text-navy-300 dark:hover:bg-white/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {dict.notifications.markAllRead}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-sm text-slate-400 dark:text-navy-500">{dict.notifications.empty}</p>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const unread = !n.read_at;
                return (
                  <Link
                    key={n.id}
                    href={n.url ?? "/"}
                    role="menuitem"
                    onClick={() => handleEntryClick(n)}
                    className={cn(
                      "flex items-start gap-2.5 border-b border-slate-50 px-3.5 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 dark:border-navy-800/60 dark:hover:bg-white/5",
                      unread && "bg-navy-50/50 dark:bg-navy-800/30"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        unread ? "bg-navy-800 text-white dark:bg-navy-600" : "bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-navy-400"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", unread ? "font-semibold text-navy-900 dark:text-white" : "font-medium text-slate-700 dark:text-navy-200")}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-navy-400">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400 dark:text-navy-500">{formatRelative(rtf, n.created_at)}</span>
                    </span>
                    {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(rtf: Intl.RelativeTimeFormat, iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}
