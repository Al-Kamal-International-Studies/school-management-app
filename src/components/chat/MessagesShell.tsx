"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { roleLabel } from "@/lib/i18n/labels";
import { useChatRealtime } from "@/components/chat/ChatRealtimeProvider";
import { ChatAvatar, useChatTime } from "@/components/chat/parts";
import { openChatAction, refreshInboxAction } from "@/app/(dashboard)/messages/actions";
import type { Contact, InboxItem } from "@/lib/chat/types";
import type { UserRole } from "@/lib/types/database.types";

type Filter = "all" | "unread" | "groups";

const at = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/**
 * Combines inbox snapshots newest-wins per chat: the one with the later last
 * message is kept; on a tie, the lower unread count (a read can only lower it).
 */
function mergeInbox(current: InboxItem[], incoming: InboxItem[]): InboxItem[] {
  const byId = new Map(current.map((c) => [c.id, c]));
  for (const next of incoming) {
    const have = byId.get(next.id);
    if (!have || at(next.lastMessageAt) > at(have.lastMessageAt)) byId.set(next.id, next);
    else if (at(next.lastMessageAt) === at(have.lastMessageAt)) byId.set(next.id, { ...have, unread: Math.min(have.unread, next.unread) });
  }
  return [...byId.values()].sort((a, b) => at(b.lastMessageAt) - at(a.lastMessageAt));
}

/**
 * The Messages screen frame: on phones the list OR the open chat fills the
 * screen (like WhatsApp); from `lg` they sit side by side. The list is kept
 * live from ChatRealtimeProvider's events, so it re-orders, previews and
 * counts unread without any reload.
 */
export function MessagesShell({
  me,
  initialInbox,
  contacts,
  children,
}: {
  me: { id: string; role: UserRole };
  initialInbox: InboxItem[];
  contacts: Contact[];
  children: ReactNode;
}) {
  const { dict } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname.split("/")[2] ?? null;
  const rt = useChatRealtime();
  const stamp = useChatTime();

  const [inbox, setInbox] = useState(initialInbox);
  const [prevInitial, setPrevInitial] = useState(initialInbox);
  if (initialInbox !== prevInitial) {
    // Next can replay a cached copy of this layout's data when a chat is
    // opened; merging newest-wins stops it rolling back live updates (QA, Part 42).
    setPrevInitial(initialInbox);
    setInbox((prev) => mergeInbox(prev, initialInbox));
  }
  const inboxRef = useRef(inbox);
  const activeRef = useRef(activeId);
  const notMine = useRef(new Set<string>());
  useEffect(() => {
    inboxRef.current = inbox;
    activeRef.current = activeId;
  }, [inbox, activeId]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(
    () =>
      rt.subscribe((e) => {
        if (e.type === "message") {
          const m = e.message;
          if (!inboxRef.current.some((c) => c.id === m.chat_id)) {
            // a chat new to me — or, for the overseer, someone else's chat:
            // refresh once, then ignore that chat if it isn't in my inbox
            if (notMine.current.has(m.chat_id)) return;
            void refreshInboxAction().then((fresh) => {
              if (!fresh.some((c) => c.id === m.chat_id)) notMine.current.add(m.chat_id);
              setInbox((prev) => mergeInbox(prev, fresh));
            });
            return;
          }
          setInbox((prev) => {
            const item = prev.find((c) => c.id === m.chat_id);
            if (!item) return prev;
            const counts = m.sender_id !== me.id && m.chat_id !== activeRef.current;
            const updated: InboxItem = {
              ...item,
              lastMessageAt: m.created_at,
              preview: m.content,
              previewHidden: false,
              lastSenderId: m.sender_id,
              unread: counts ? item.unread + 1 : item.unread,
            };
            return [updated, ...prev.filter((c) => c.id !== m.chat_id)];
          });
        } else if (e.type === "read") {
          setInbox((prev) => prev.map((c) => (c.id === e.chatId ? { ...c, unread: 0 } : c)));
        } else if (e.type === "resync") {
          void refreshInboxAction().then((fresh) => setInbox((prev) => mergeInbox(prev, fresh)));
        }
      }),
    [rt, me.id]
  );

  const q = query.trim().toLowerCase();
  const visibleContacts = useMemo(
    () => contacts.filter((c) => !q || c.fullName.toLowerCase().includes(q) || c.context?.toLowerCase().includes(q)),
    [contacts, q]
  );
  const visibleChats = useMemo(
    () =>
      inbox.filter(
        (c) =>
          (!q || c.title.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q)) &&
          (filter === "all" || (filter === "unread" ? c.unread > 0 : c.kind === "group"))
      ),
    [inbox, q, filter]
  );

  function openContact(c: Contact) {
    const existing = inbox.find((i) => i.otherId === c.id);
    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }
    setOpening(c.id);
    setOpenError(false);
    startTransition(async () => {
      const res = await openChatAction(c.id);
      setOpening(null);
      if (res.chatId) router.push(`/messages/${res.chatId}`);
      else setOpenError(true);
    });
  }

  const typingIn = (chatId: string) => (rt.typing.get(chatId)?.size ?? 0) > 0;

  return (
    <div
      className={cn(
        "-mx-4 -mb-12 -mt-6 flex h-[calc(100dvh-4rem)] overflow-hidden bg-white dark:bg-navy-950 sm:-mx-6",
        "lg:mx-0 lg:-mb-8 lg:mt-0 lg:h-[calc(100dvh-8rem)] lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-card lg:dark:border-navy-800"
      )}
    >
      {/* ---------- left: contacts + chats ---------- */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-slate-200 dark:border-navy-800 lg:w-[360px] lg:border-e",
          activeId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="space-y-3 border-b border-slate-200 px-4 pb-3 pt-4 dark:border-navy-800">
          <h1 className="page-title-compact">{dict.messages.title}</h1>
          <label className="relative block">
            <span className="sr-only">{dict.messages.search}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dict.messages.search}
              className="input h-10 w-full ps-9"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* people I can message: Sahar sees her students here */}
          <section aria-label={dict.messages.startChat} className="border-b border-slate-200 py-3 dark:border-navy-800">
            <p className="eyebrow mb-2 px-4">{dict.messages.startChat}</p>
            {visibleContacts.length === 0 ? (
              <p className="px-4 text-sm text-slate-500 dark:text-navy-400">{q ? dict.messages.noResults : dict.messages.noContacts}</p>
            ) : (
              <ul className="flex gap-1 overflow-x-auto px-2 pb-1 [scrollbar-width:thin]">
                {visibleContacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openContact(c)}
                      disabled={opening !== null}
                      title={c.context ? `${c.fullName} · ${c.context}` : c.fullName}
                      className="flex w-[76px] flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 disabled:opacity-60 dark:hover:bg-white/5"
                    >
                      <span className="relative">
                        <ChatAvatar name={c.fullName} url={c.avatarUrl} size="lg" online={rt.online.has(c.id)} />
                        {opening === c.id && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 dark:bg-navy-950/70">
                            <Loader2 className="h-5 w-5 animate-spin text-navy-700 dark:text-white" />
                          </span>
                        )}
                      </span>
                      <span className="w-full truncate text-xs font-medium text-slate-800 dark:text-navy-100">{c.fullName.split(" ")[0]}</span>
                      <span className="-mt-1 w-full truncate text-[11px] text-slate-500 dark:text-navy-400">
                        {c.role === "student" || c.role === "teacher" ? c.context ?? roleLabel(dict, c.role) : roleLabel(dict, c.role)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {openError && <p className="px-4 pt-1 text-sm text-red-600">{dict.messages.openChatFailed}</p>}
          </section>

          {/* chats, WhatsApp-style */}
          <div className="flex gap-2 px-4 pb-1 pt-3" role="tablist" aria-label={dict.messages.chats}>
            {(["all", "unread", "groups"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-navy-900 text-white dark:bg-white dark:text-navy-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700"
                )}
              >
                {f === "all" ? dict.messages.filterAll : f === "unread" ? dict.messages.filterUnread : dict.messages.filterGroups}
              </button>
            ))}
          </div>

          {visibleChats.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-navy-400">{q ? dict.messages.noResults : dict.messages.noConversations}</p>
          ) : (
            <ul className="py-1">
              {visibleChats.map((c) => {
                const active = c.id === activeId;
                const typing = typingIn(c.id);
                const mine = c.lastSenderId === me.id;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages/${c.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 transition-colors focus:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-white/5",
                        active ? "bg-slate-100 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <ChatAvatar name={c.title} url={c.avatarUrl} group={c.kind === "group"} online={!!c.otherId && rt.online.has(c.otherId)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</span>
                          {c.lastMessageAt && (
                            <span className={cn("shrink-0 text-xs tabular", c.unread ? "font-semibold text-navy-800 dark:text-white" : "text-slate-500 dark:text-navy-400")}>
                              {stamp.listStamp(c.lastMessageAt)}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={cn("min-w-0 flex-1 truncate text-[13px]", typing ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-navy-400")}>
                            {typing ? (
                              dict.messages.typing
                            ) : c.previewHidden ? (
                              <em>{dict.messages.hiddenMessage}</em>
                            ) : c.preview ? (
                              <>
                                {mine && `${dict.messages.you}: `}
                                <bdi dir="auto">{c.preview}</bdi>
                              </>
                            ) : (
                              c.subtitle && dict.messages.taughtBy.replace("{teacher}", c.subtitle)
                            )}
                          </span>
                          {c.unread > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-navy-800 px-1.5 text-[11px] font-semibold text-white tabular dark:bg-white dark:text-navy-950">
                              {c.unread > 99 ? "99+" : c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ---------- right: the open chat ---------- */}
      <section className={cn("min-w-0 flex-1 flex-col", activeId ? "flex" : "hidden lg:flex")}>{children}</section>
    </div>
  );
}
