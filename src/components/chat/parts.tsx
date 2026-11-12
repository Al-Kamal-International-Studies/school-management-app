"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Icon } from "@/components/chat/icons";
import type { Tick } from "@/lib/chat/types";

/** Spec §10: first letter of the first word + first letter of the last word, max 2. */
export function chatInitials(name: string): string {
  // words that start with a letter or digit ("(QA)" and "·" don't count)
  const words = name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "";
  const first = Array.from(words[0]!)[0]!;
  const last = words.length > 1 ? Array.from(words[words.length - 1]!)[0]! : "";
  return (first + last).toLocaleUpperCase();
}

const SENDER_COLORS = ["#0e7490", "#7c3aed", "#b45309", "#be123c", "#15803d", "#1d4ed8"];

/** Spec §5.4: a deterministic brand-compatible hue per sender inside a group. */
export function senderColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length]!;
}

const AVATAR_PX = { sm: 40, md: 49, lg: 56 } as const;

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
  const px = AVATAR_PX[size];
  const text = chatInitials(name);
  return (
    <span className="ch-avatar" style={{ width: px, height: px }}>
      <span className="ch-avatar-face" style={{ fontSize: Math.round(px * 0.33) }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : text ? (
          text
        ) : (
          <Icon name="grp" size={Math.round(px * 0.5)} />
        )}
      </span>
      {online && !group && <span className="ch-online" aria-hidden />}
    </span>
  );
}

/**
 * Receipts (spec §5.4). `list` = the 17px mint/slate tick in a chat-list preview,
 * `bubble` = the 16px tick inside a sent bubble (white 70%, mint once read).
 */
export function Ticks({ tick, variant = "bubble" }: { tick: Tick; variant?: "bubble" | "list" }) {
  const { dict } = useLocale();
  const label = { pending: dict.messages.sending, sent: dict.messages.sent, delivered: dict.messages.delivered, read: dict.messages.read, failed: dict.messages.failed }[tick];
  const size = variant === "list" ? 17 : 16;
  const name = tick === "pending" ? "clock" : tick === "sent" ? "tick-single" : tick === "failed" ? "alert" : "tick";
  return (
    <span title={label} className={`ch-tick ch-tick-${variant} is-${tick}`}>
      <span className="sr-only">{label}</span>
      <Icon name={name} size={size} />
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

/** Splits `text` around case-insensitive matches of `needle` and wraps each in <mark>. */
function highlight(text: string, needle: string, keyBase: string): React.ReactNode[] {
  if (!needle) return [text];
  const out: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let at = 0;
  for (let i = lower.indexOf(n); i !== -1; i = lower.indexOf(n, at)) {
    if (i > at) out.push(text.slice(at, i));
    out.push(<mark key={`${keyBase}-${i}`}>{text.slice(i, i + n.length)}</mark>);
    at = i + n.length;
  }
  out.push(text.slice(at));
  return out;
}

/** Message text with clickable links, plus a "Join meeting" card for Meet/Zoom/Teams links. */
export function MessageText({ text, find }: { text: string; find?: string }) {
  const { dict } = useLocale();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const u = toUrl(m[0]);
    if (!u) continue;
    parts.push(...highlight(text.slice(last, m.index), find ?? "", `t${m.index}`));
    parts.push(
      <a key={m.index} href={u.href} target="_blank" rel="noopener noreferrer nofollow">
        {m[0]}
      </a>
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(...highlight(text.slice(last), find ?? "", "tail"));
  const meeting = meetingOf(text);

  return (
    <div className="ch-msg-body">
      <bdi dir="auto" className="ch-msg-text">
        {parts}
      </bdi>
      {meeting && (
        <a href={meeting.url} target="_blank" rel="noopener noreferrer nofollow" className="ch-meet">
          <Icon name="video" size={20} />
          <span>
            {dict.messages.joinMeeting}
            <small>{meeting.app}</small>
          </span>
        </a>
      )}
    </div>
  );
}

export function useChatTime() {
  const { dict, locale } = useLocale();
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthDay = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const full = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });

  const dayDiff = (iso: string) => {
    const d = new Date(iso);
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((b - a) / 86400000);
  };

  return {
    time: (iso: string) => time.format(new Date(iso)),
    /** chat list (spec §4.4): 9:41 AM / Yesterday / Mon / Oct 29 / Oct 29, 2025 */
    listStamp: (iso: string) => {
      const diff = dayDiff(iso);
      const d = new Date(iso);
      if (diff <= 0) return time.format(d);
      if (diff === 1) return dict.messages.yesterday;
      if (diff <= 6) return weekdayShort.format(d);
      return d.getFullYear() === new Date().getFullYear() ? monthDay.format(d) : full.format(d);
    },
    /** pill between days inside a chat (spec §5.3): Today / Yesterday / Monday / Oct 29, 2026 */
    dayLabel: (iso: string) => {
      const diff = dayDiff(iso);
      if (diff <= 0) return dict.messages.today;
      if (diff === 1) return dict.messages.yesterday;
      if (diff <= 6) return weekdayLong.format(new Date(iso));
      return full.format(new Date(iso));
    },
    dayKey: (iso: string) => new Date(iso).toDateString(),
  };
}
