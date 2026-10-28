"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useChatRealtime } from "@/components/chat/ChatRealtimeProvider";

/** The Topbar's chat icon, beside the bell: opens Messages, live unread badge. */
export function MessagesButton() {
  const { dict } = useLocale();
  const { unreadTotal } = useChatRealtime();
  const active = usePathname().startsWith("/messages");
  const label = unreadTotal > 0 ? `${dict.messages.title} (${unreadTotal})` : dict.messages.title;

  return (
    <Link
      href="/messages"
      aria-label={label}
      title={dict.messages.title}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500",
        active
          ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white"
      )}
    >
      <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
      {unreadTotal > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white tabular dark:ring-navy-950">
          {unreadTotal > 9 ? "9+" : unreadTotal}
        </span>
      )}
    </Link>
  );
}
