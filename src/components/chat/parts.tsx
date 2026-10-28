"use client";

import { AlertCircle, Check, CheckCheck, Clock, Users, Video } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Tick } from "@/lib/chat/types";

export function ChatAvatar({
  name,
  url,
  group,
  online,
  size = "md",
}: {
  name: string;
  url?: string | null;
  group?: boolean;
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-medium",
          group ? "bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-navy-200" : "bg-navy-900 text-white dark:bg-navy-700",
          box
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : group ? (
          <Users className="h-[45%] w-[45%]" strokeWidth={1.75} />
        ) : (
          initials(name)
        )}
      </span>
      {online && (
        <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-navy-950" aria-hidden />
      )}
    </span>
  );
}

/** WhatsApp ticks. Read = ✓✓ in the status green (DESIGN.md: green = done). */
export function Ticks({ tick, onDark }: { tick: Tick; onDark?: boolean }) {
  const { dict } = useLocale();
  const label = { pending: dict.messages.sending, sent: dict.messages.sent, delivered: dict.messages.delivered, read: dict.messages.read, failed: dict.messages.failed }[tick];
  const base = onDark ? "text-white/60" : "text-slate-400 dark:text-navy-400";
  const cls = "h-3.5 w-3.5 shrink-0";
  return (
    <span title={label} className="inline-flex">
      <span className="sr-only">{label}</span>
      {tick === "pending" && <Clock className={cn(cls, base)} strokeWidth={2} />}
      {tick === "sent" && <Check className={cn(cls, base)} strokeWidth={2.25} />}
      {tick === "delivered" && <CheckCheck className={cn(cls, base)} strokeWidth={2.25} />}
      {tick === "read" && <CheckCheck className={cn(cls, onDark ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400")} strokeWidth={2.25} />}
      {tick === "failed" && <AlertCircle className={cn(cls, "text-red-500")} strokeWidth={2} />}
    </span>
  );
}

const URL_RE = /((?:https?:\/\/|(?=(?:meet\.google\.com|zoom\.us|[\w-]+\.zoom\.us|teams\.microsoft\.com|teams\.live\.com)\/))[^\s<]+[^\s<.,;:!?)\]'"])/gi;

const MEETING_HOSTS: [RegExp, string][] = [
  [/(^|\.)meet\.google\.com$/, "Google Meet"],
  [/(^|\.)zoom\.us$/, "Zoom"],
  [/(^|\.)teams\.(microsoft|live)\.com$/, "Microsoft Teams"],
];

function toUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

export function meetingOf(text: string): { url: string; app: string } | null {
  for (const m of text.matchAll(URL_RE)) {
    const u = toUrl(m[0]);
    const app = u && MEETING_HOSTS.find(([re]) => re.test(u.hostname))?.[1];
    if (u && app) return { url: u.href, app };
  }
  return null;
}

/** Message text with clickable links, plus a "Join meeting" card for Meet/Zoom/Teams links. */
export function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const { dict } = useLocale();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const u = toUrl(m[0]);
    if (!u) continue;
    parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={m.index}
        href={u.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn("underline underline-offset-2 [overflow-wrap:anywhere]", mine ? "text-white" : "text-navy-700 dark:text-navy-200")}
      >
        {m[0]}
      </a>
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  const meeting = meetingOf(text);

  return (
    <>
      <bdi dir="auto" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {parts}
      </bdi>
      {meeting && (
        <a
          href={meeting.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={cn(
            "mt-2 flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            mine
              ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
              : "border-slate-200 bg-slate-50 text-navy-900 hover:bg-slate-100 dark:border-navy-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
          )}
        >
          <Video className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            {dict.messages.joinMeeting}
            <span className={cn("block truncate text-xs font-normal", mine ? "text-white/70" : "text-slate-500 dark:text-navy-400")}>{meeting.app}</span>
          </span>
        </a>
      )}
    </>
  );
}

export function useChatTime() {
  const { dict, locale } = useLocale();
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });

  const dayDiff = (iso: string) => {
    const d = new Date(iso);
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((b - a) / 86400000);
  };

  return {
    time: (iso: string) => time.format(new Date(iso)),
    /** chat list: 14:05 / Yesterday / Tuesday / 3 Oct 2026 */
    listStamp: (iso: string) => {
      const diff = dayDiff(iso);
      if (diff === 0) return time.format(new Date(iso));
      if (diff === 1) return dict.messages.yesterday;
      if (diff < 7) return weekday.format(new Date(iso));
      return short.format(new Date(iso));
    },
    /** divider between days inside a chat */
    dayLabel: (iso: string) => {
      const diff = dayDiff(iso);
      if (diff === 0) return dict.messages.today;
      if (diff === 1) return dict.messages.yesterday;
      if (diff < 7) return weekday.format(new Date(iso));
      return short.format(new Date(iso));
    },
    dayKey: (iso: string) => new Date(iso).toDateString(),
  };
}
