"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "@/components/chat/chat.css";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { roleLabel } from "@/lib/i18n/labels";
import { useChatRealtime } from "@/components/chat/ChatRealtimeProvider";
import { ChatAvatar, Ticks, useChatTime } from "@/components/chat/parts";
import { Icon, type IconName } from "@/components/chat/icons";
import { usePopover } from "@/components/chat/usePopover";
import { useKeyboardViewport } from "@/components/chat/useKeyboardViewport";
import { openChatAction, refreshInboxAction } from "@/app/(dashboard)/messages/actions";
import type { Contact, InboxItem } from "@/lib/chat/types";
import { applyMessage, mergeInbox, needsSenderLookup } from "@/lib/chat/inbox";
import type { UserRole } from "@/lib/types/database.types";

type Filter = "all" | "unread" | "groups";

function RailButton({ icon, label, active, dot, onClick, href }: { icon: IconName; label: string; active?: boolean; dot?: boolean; onClick?: () => void; href?: string }) {
  const cls = `ch-rail-btn${active ? " is-active" : ""}`;
  const inner = (
    <>
      <Icon name={icon} />
      {dot && <span className="ch-dot" aria-hidden />}
    </>
  );
  return href ? (
    <Link href={href} className={cls} title={label} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} title={label} aria-label={label} aria-pressed={active} onClick={onClick}>
      {inner}
    </button>
  );
}

/**
 * The Messages screen ("Light Rail", Part 55): icon rail, chat list, conversation.
 * The list is kept live from ChatRealtimeProvider's events, so it re-orders,
 * previews and counts unread without any reload. Below 900px of frame width
 * the list OR the open chat fills the frame (see chat.css).
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
  const frameRef = useRef<HTMLDivElement>(null);
  useKeyboardViewport(frameRef);

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
    contactsRef.current = contacts;
  }, [inbox, activeId, contacts]);

  const [query, setQuery] = useState("");
  const [panelQuery, setPanelQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState(false);
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen, menuAttach] = usePopover<HTMLDivElement>();
  const searchRef = useRef<HTMLInputElement>(null);
  const panelBackRef = useRef<HTMLButtonElement>(null);
  const newChatBtnRef = useRef<HTMLButtonElement>(null);
  const contactsRef = useRef(contacts);
  const listRef = useRef<HTMLUListElement>(null);

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
          // the lookup is a side effect, so it lives here and not in the state updater
          if (needsSenderLookup(inboxRef.current, contactsRef.current, m, me.id)) {
            void refreshInboxAction().then((fresh) => setInbox((prev) => mergeInbox(prev, fresh)));
          }
          setInbox((prev) => applyMessage(prev, contactsRef.current, m, me.id, activeRef.current));
        } else if (e.type === "read") {
          setInbox((prev) => prev.map((c) => (c.id === e.chatId ? { ...c, unread: 0 } : c)));
        } else if (e.type === "resync") {
          void refreshInboxAction().then((fresh) => setInbox((prev) => mergeInbox(prev, fresh)));
        }
      }),
    [rt, me.id]
  );

  // opening the New chat panel moves focus into it
  useEffect(() => {
    if (panelOpen) panelBackRef.current?.focus();
  }, [panelOpen]);

  // "/" jumps to the search field (spec §4.4)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const unreadChats = inbox.filter((c) => c.unread > 0).length;
  const groupChats = inbox.filter((c) => c.kind === "group").length;
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const visibleChats = useMemo(
    () =>
      inbox.filter(
        (c) =>
          (!q || c.title.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q)) &&
          (filter === "all" || (filter === "unread" ? c.unread > 0 : c.kind === "group"))
      ),
    [inbox, q, filter]
  );
  // people matching the search who I have no chat with yet: a chat can start from search
  const searchPeople = useMemo(
    () =>
      q
        ? contacts.filter(
            (c) => !inbox.some((i) => i.otherId === c.id) && (c.fullName.toLowerCase().includes(q) || c.context?.toLowerCase().includes(q))
          )
        : [],
    [contacts, inbox, q]
  );

  const pq = panelQuery.trim().toLowerCase();
  const panelGroups = useMemo(() => {
    const matches = contacts.filter((c) => !pq || c.fullName.toLowerCase().includes(pq) || c.context?.toLowerCase().includes(pq));
    const groups: { role: UserRole; people: Contact[] }[] = [];
    for (const c of matches) {
      const g = groups.find((x) => x.role === c.role);
      if (g) g.people.push(c);
      else groups.push({ role: c.role, people: [c] });
    }
    return groups;
  }, [contacts, pq]);

  function openContact(c: Contact) {
    const existing = inbox.find((i) => i.otherId === c.id);
    if (existing) {
      closePanel();
      router.push(`/messages/${existing.id}`);
      return;
    }
    setOpening(c.id);
    setOpenError(false);
    startTransition(async () => {
      const res = await openChatAction(c.id);
      setOpening(null);
      if (res.chatId) {
        closePanel();
        router.push(`/messages/${res.chatId}`);
      } else setOpenError(true);
    });
  }

  function openPanel() {
    setMenuOpen(false);
    setPanelQuery("");
    setOpenError(false);
    setPanelOpen(true);
  }
  function closePanel() {
    setPanelOpen(false);
    setPanelQuery("");
    // give focus back to the control that opens the panel
    requestAnimationFrame(() => newChatBtnRef.current?.focus());
  }
  function markAllRead() {
    setMenuOpen(false);
    for (const c of inbox) if (c.unread > 0 && c.lastMessageAt) rt.markRead(c.id, c.lastMessageAt);
  }

  // Up/Down walk the list, Enter opens (links activate natively)
  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    if (rows.length === 0) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? Math.min(i + 1, rows.length - 1) : Math.max(i - 1, 0);
    rows[i === -1 ? 0 : next]?.focus();
  }

  const typingIn = (chatId: string) => (rt.typing.get(chatId)?.size ?? 0) > 0;

  function preview(c: InboxItem) {
    const mine = c.lastSenderId === me.id;
    if (typingIn(c.id)) return <span>{dict.messages.typing}</span>;
    if (c.previewHidden)
      return (
        <span>
          <em>{dict.messages.hiddenMessage}</em>
        </span>
      );
    if (c.preview) {
      const senderName = c.kind === "group" && !mine ? c.lastSenderName ?? (c.lastSenderId ? contactById.get(c.lastSenderId)?.fullName : null) : null;
      return (
        <>
          {mine && <Ticks tick="sent" variant="list" />}
          <bdi dir="auto">{senderName ? `${senderName.split(" ")[0]}: ${c.preview}` : c.preview}</bdi>
        </>
      );
    }
    return <span>{c.kind === "group" && c.subtitle ? dict.messages.taughtBy.replace("{teacher}", c.subtitle) : dict.messages.noMessagesYet}</span>;
  }

  const searchField = (value: string, onChange: (v: string) => void, placeholder: string, ref?: React.Ref<HTMLInputElement>, inert?: boolean) => (
    <div className="ch-search" inert={inert}>
      <Icon name="search" />
      <input ref={ref} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" />
      {value && (
        <button type="button" className="ch-clear" aria-label={dict.messages.clearSearch} onClick={() => onChange("")}>
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  );

  const personRow = (c: Contact) => (
    <li key={c.id}>
      <button type="button" className="ch-row" onClick={() => openContact(c)} disabled={opening !== null} aria-busy={opening === c.id}>
        <ChatAvatar name={c.fullName} url={c.avatarUrl} online={rt.online.has(c.id)} />
        <span className="ch-row-mid">
          <span className="ch-line">
            <span className="ch-name">{c.fullName}</span>
          </span>
          <span className="ch-line">
            <span className="ch-preview">
              <span>{c.context ?? roleLabel(dict, c.role)}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );

  return (
    <div ref={frameRef} className="ch-frame -mx-4 -mb-12 -mt-6 sm:-mx-6 lg:mx-auto lg:-mb-8 lg:mt-0">
      <div className="ch-app" data-open={activeId ? "true" : "false"}>
        {/* ---------- icon rail ---------- */}
        <nav className="ch-rail" aria-label={dict.messages.navLabel}>
          <RailButton
            icon="chat"
            label={dict.messages.chats}
            active={!panelOpen && filter !== "groups"}
            dot={unreadChats > 0}
            onClick={() => {
              closePanel();
              setFilter("all");
            }}
          />
          <RailButton
            icon="grp"
            label={dict.messages.filterGroups}
            active={!panelOpen && filter === "groups"}
            onClick={() => {
              closePanel();
              setFilter("groups");
            }}
          />
          <RailButton icon="dir" label={dict.messages.directory} active={panelOpen} onClick={openPanel} />
          <span className="ch-rail-spacer" />
          <RailButton icon="gear" label={dict.messages.settings} href="/settings" />
        </nav>

        {/* ---------- chat list ---------- */}
        <aside className="ch-list">
          <div className="ch-list-head" inert={panelOpen}>
            <h1 className="ch-title">{dict.messages.title}</h1>
            <button ref={newChatBtnRef} type="button" className="ch-icon-btn is-solid" aria-label={dict.messages.newChat} title={dict.messages.newChat} onClick={openPanel}>
              <Icon name="plus" />
            </button>
            <div className="ch-menu-wrap" ref={menuAttach}>
              <button
                type="button"
                className="ch-icon-btn"
                aria-label={dict.messages.moreOptions}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Icon name="dots" />
              </button>
              {menuOpen && (
                <div className="ch-pop" role="menu" style={{ insetBlockStart: 44, insetInlineEnd: 0 }}>
                  <button type="button" role="menuitem" onClick={markAllRead} disabled={unreadChats === 0} style={unreadChats === 0 ? { opacity: 0.45 } : undefined}>
                    <Icon name="tick" size={20} />
                    {dict.messages.markAllRead}
                  </button>
                  <span className="ch-narrow-items">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setFilter("groups");
                      }}
                    >
                      <Icon name="grp" size={20} />
                      {dict.messages.filterGroups}
                    </button>
                    <button type="button" role="menuitem" onClick={openPanel}>
                      <Icon name="dir" size={20} />
                      {dict.messages.directory}
                    </button>
                  </span>
                  <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <Icon name="gear" size={20} />
                    {dict.messages.settings}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {searchField(query, setQuery, dict.messages.search, searchRef, panelOpen)}

          <div className="ch-chips" role="tablist" inert={panelOpen} aria-label={dict.messages.chats}>
            {(
              [
                ["all", dict.messages.filterAll, 0],
                ["unread", dict.messages.filterUnread, unreadChats],
                ["groups", dict.messages.filterGroups, groupChats],
              ] as const
            ).map(([f, label, count]) => (
              <button key={f} type="button" role="tab" className="ch-chip" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {label}
                {count > 0 && <i>{count}</i>}
              </button>
            ))}
          </div>

          <div className="ch-rows ch-scroll" inert={panelOpen}>
            <ul ref={listRef} role="listbox" aria-label={dict.messages.chats} onKeyDown={onListKey}>
              {visibleChats.map((c) => {
                const active = c.id === activeId;
                const typing = typingIn(c.id);
                return (
                  <li key={c.id} role="presentation">
                    <Link href={`/messages/${c.id}`} role="option" aria-selected={active} className="ch-row">
                      <ChatAvatar name={c.title} url={c.avatarUrl} group={c.kind === "group"} online={!!c.otherId && rt.online.has(c.otherId)} />
                      <span className="ch-row-mid">
                        <span className="ch-line">
                          <span className="ch-name">
                            <bdi>{c.title}</bdi>
                          </span>
                          {c.lastMessageAt && <span className={`ch-stamp${c.unread ? " is-unread" : ""}`}>{stamp.listStamp(c.lastMessageAt)}</span>}
                        </span>
                        <span className="ch-line">
                          <span className={`ch-preview${typing ? " is-typing" : ""}`}>{preview(c)}</span>
                          {c.unread > 0 && <span className="ch-badge">{c.unread > 99 ? "99+" : c.unread}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {visibleChats.length === 0 && searchPeople.length === 0 && (
              <p className="ch-none">{q || filter === "unread" ? dict.messages.noResults : dict.messages.noConversations}</p>
            )}

            {searchPeople.length > 0 && (
              <section aria-label={dict.messages.people}>
                <p className="ch-section">{dict.messages.people}</p>
                <ul>{searchPeople.map((c) => personRow(c))}</ul>
                {openError && <p className="ch-error">{dict.messages.openChatFailed}</p>}
              </section>
            )}
          </div>

          {/* ---------- new chat panel: replaces the list contents ---------- */}
          {panelOpen && (
            <section className="ch-panel" aria-label={dict.messages.newChat}>
              <div className="ch-panel-head">
                <button ref={panelBackRef} type="button" className="ch-icon-btn ch-flip" aria-label={dict.messages.back} onClick={closePanel}>
                  <Icon name="arrow-left" />
                </button>
                <h2 className="ch-panel-title">{dict.messages.newChat}</h2>
              </div>
              {searchField(panelQuery, setPanelQuery, dict.messages.searchPeople)}
              <div className="ch-rows ch-scroll">
                {panelGroups.length === 0 && <p className="ch-none">{pq ? dict.messages.noResults : dict.messages.noContacts}</p>}
                {panelGroups.map((g) => (
                  <section key={g.role} aria-label={roleLabel(dict, g.role)}>
                    <p className="ch-section">{roleLabel(dict, g.role)}</p>
                    <ul>{g.people.map((c) => personRow(c))}</ul>
                  </section>
                ))}
                {openError && (
                  <p className="ch-error" role="alert">
                    {dict.messages.openChatFailed}
                  </p>
                )}
              </div>
            </section>
          )}
        </aside>

        {/* ---------- the open chat ---------- */}
        {children}
      </div>
    </div>
  );
}
