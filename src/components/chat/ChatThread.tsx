"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { roleLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/client";
import { useChatRealtime } from "@/components/chat/ChatRealtimeProvider";
import { ChatAvatar, MessageText, Ticks, senderColor, useChatTime } from "@/components/chat/parts";
import { Icon } from "@/components/chat/icons";
import { usePopover } from "@/components/chat/usePopover";
import { loadMessagesAction } from "@/app/(dashboard)/messages/actions";
import { tickFor, type ChatDetail, type UiMessage } from "@/lib/chat/types";
import type { ChatMessage, ChatReceipt } from "@/lib/types/database.types";

const NEAR_BOTTOM_PX = 120;
const MAX_INPUT_PX = 122; // 5 lines of 20px + 2 × 11px padding
const EMOJI = "😀 😂 🥹 😊 😍 😎 🤔 😢 😭 😡 👍 👎 👏 🙏 💪 👋 🎉 🎓 📚 ✏️ ⭐ ❤️ ✅ ❌".split(" ");

function fromRow(m: ChatMessage): UiMessage {
  return { id: m.id, chatId: m.chat_id, senderId: m.sender_id, clientId: m.client_id, content: m.content, createdAt: m.created_at, status: "sent" };
}

/** Stored messages in time order, then my still-sending/failed ones. Dedupes by id and by my clientId. */
function merge(prev: UiMessage[], incoming: UiMessage[]): UiMessage[] {
  const byClient = new Map(incoming.map((m) => [m.clientId, m]));
  const ids = new Set(incoming.map((m) => m.id));
  const kept = prev.filter((m) => !ids.has(m.id) && !(m.status !== "sent" && byClient.has(m.clientId)));
  const all = [...kept, ...incoming];
  const stored = all.filter((m) => m.status === "sent").sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return [...stored, ...all.filter((m) => m.status !== "sent")];
}

export function ChatThread({ myId, detail }: { myId: string; detail: ChatDetail }) {
  const { dict } = useLocale();
  const rt = useChatRealtime();
  const fmt = useChatTime();
  const chatId = detail.id;

  const [messages, setMessages] = useState<UiMessage[]>(detail.messages);
  const [receipts, setReceipts] = useState(() => new Map(detail.receipts.map((r) => [r.user_id, r])));
  const [hasMore, setHasMore] = useState(detail.hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [multiline, setMultiline] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // "N unread messages" divider: fixed at open, from my read mark before it advances
  const [unread] = useState(() => {
    if (detail.oversight) return { id: null as string | null, count: 0 };
    const mark = detail.receipts.find((r) => r.user_id === myId)?.read_up_to;
    const from = mark ? Date.parse(mark) : 0;
    const fresh = detail.messages.filter((m) => m.senderId !== myId && Date.parse(m.createdAt) > from);
    return { id: fresh[0]?.clientId ?? null, count: fresh.length };
  });

  // search in chat
  const [searching, setSearching] = useState(false);
  const [find, setFind] = useState("");
  const [hit, setHit] = useState(0);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const findInput = useRef<HTMLInputElement>(null);
  const prependAnchor = useRef<number | null>(null);
  const lastMarked = useRef<string | null>(null);
  const stickToBottom = useRef(!unread.id);
  const mounted = useRef(false);
  const atBottom = useRef(!unread.id);
  const [launch, setLaunch] = useState(0);
  const messagesRef = useRef(messages);
  const [headMenuOpen, setHeadMenuOpen, headMenuAttach] = usePopover<HTMLDivElement>();
  const [emojiOpen, setEmojiOpen, emojiAttach] = usePopover<HTMLDivElement>();
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const nearBottom = () => {
    const el = scroller.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };
  const scrollToBottom = (smooth: boolean) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setShowJump(false);
    setNewCount(0);
  };

  // ---- read receipts: mark read while the chat is on screen ----
  const markRead = useCallback(() => {
    if (detail.oversight || document.visibilityState !== "visible") return;
    const latest = [...messages].reverse().find((m) => m.status === "sent");
    if (!latest || latest.createdAt === lastMarked.current) return;
    lastMarked.current = latest.createdAt;
    rt.markRead(chatId, latest.createdAt);
  }, [messages, rt, chatId, detail.oversight]);

  useEffect(() => {
    rt.setActiveChat(chatId);
    return () => rt.setActiveChat(null);
  }, [rt, chatId]);

  useEffect(() => {
    markRead();
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // ---- live updates ----
  useEffect(
    () =>
      rt.subscribe((e) => {
        if (e.type === "message" && e.message.chat_id === chatId) {
          const follow = e.message.sender_id === myId || nearBottom();
          stickToBottom.current = follow;
          if (!follow) setNewCount((n) => n + 1);
          setMessages((prev) => merge(prev, [fromRow(e.message)]));
        } else if (e.type === "receipt" && e.receipt.chat_id === chatId) {
          setReceipts((prev) => new Map(prev).set(e.receipt.user_id, e.receipt));
        } else if (e.type === "resync") {
          const lastStored = [...messagesRef.current].reverse().find((m) => m.status === "sent");
          void loadMessagesAction(chatId, { after: lastStored?.createdAt ?? new Date(0).toISOString() }).then((r) =>
            setMessages((prev) => merge(prev, r.messages))
          );
          void createClient()
            .from("chat_receipts")
            .select("*")
            .eq("chat_id", chatId)
            .then(({ data }) => data && setReceipts(new Map(data.map((r: ChatReceipt) => [r.user_id, r]))));
        }
      }),
    [rt, chatId, myId]
  );

  // ---- scrolling ----
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (!mounted.current) {
      // opening: land on the first unread message, else the newest
      mounted.current = true;
      const divider = el.querySelector<HTMLElement>("[data-unread-divider]");
      if (divider) {
        el.scrollTop = Math.max(0, divider.offsetTop - 12);
        setShowJump(!nearBottom());
      } else scrollToBottom(false);
      return;
    }
    if (prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
      return;
    }
    if (stickToBottom.current) scrollToBottom(false);
    else setShowJump(!nearBottom());
  }, [messages.length]);

  // When the frame shrinks (phone keyboard opening), keep the newest message
  // in view if the reader was already at the bottom, like WhatsApp.
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function loadOlder() {
    const first = messages.find((m) => m.status === "sent");
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const r = await loadMessagesAction(chatId, { before: first.createdAt });
    prependAnchor.current = (scroller.current?.scrollHeight ?? 0) - (scroller.current?.scrollTop ?? 0);
    setMessages((prev) => merge(prev, r.messages));
    setHasMore(r.hasMore);
    setLoadingOlder(false);
  }

  // ---- sending (optimistic) ----
  async function deliver(content: string, clientId: string) {
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, clientId, content }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
      if (res.ok && json.message) {
        setMessages((prev) => merge(prev, [fromRow(json.message!)]));
        return;
      }
      if (json.error === "blocked") {
        setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
        setBanner(dict.messages.blocked);
        return;
      }
      const error = json.error === "not_allowed" ? dict.messages.notAllowed : json.error === "rate_limited" ? dict.messages.rateLimited : dict.messages.failed;
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: "failed", error } : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: "failed", error: dict.messages.failed } : m)));
    }
  }

  function send() {
    const content = text.trim();
    if (!content) return;
    const clientId = crypto.randomUUID();
    setText("");
    setBanner(null);
    setLaunch((n) => n + 1);
    stickToBottom.current = true;
    atBottom.current = true;
    setMessages((prev) => [
      ...prev,
      { id: clientId, chatId, senderId: myId, clientId, content, createdAt: new Date().toISOString(), status: "sending" },
    ]);
    void deliver(content, clientId);
    input.current?.focus();
  }

  function retry(m: UiMessage) {
    setMessages((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, status: "sending", error: undefined } : x)));
    void deliver(m.content, m.clientId);
  }

  // auto-grow the composer up to 5 lines, then scroll inside it
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(el.scrollHeight, MAX_INPUT_PX);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_PX ? "auto" : "hidden";
    setMultiline(h > 42);
  }, [text]);

  function insertEmoji(e: string) {
    const el = input.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((t) => (t.slice(0, start) + e + t.slice(end)).slice(0, 4000));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + e.length, start + e.length);
    });
  }

  // ---- search in chat ----
  const needle = find.trim().toLowerCase();
  const hits = useMemo(
    () => (needle ? messages.filter((m) => !m.hidden && m.content.toLowerCase().includes(needle)).map((m) => m.clientId) : []),
    [messages, needle]
  );
  const hitId = hits.length ? hits[((hit % hits.length) + hits.length) % hits.length] : null;
  useEffect(() => {
    if (!hitId) return;
    scroller.current?.querySelector(`[data-mid="${hitId}"]`)?.scrollIntoView({ block: "center" });
  }, [hitId]);
  useEffect(() => {
    if (searching) findInput.current?.focus();
  }, [searching]);
  function openSearch() {
    setHeadMenuOpen(false);
    setSearching(true);
  }
  function closeSearch() {
    setSearching(false);
    setFind("");
    setHit(0);
  }

  // ---- header subtitle ----
  const typers = [...(rt.typing.get(chatId)?.keys() ?? [])];
  const online = !!detail.otherId && rt.online.has(detail.otherId);
  let subtitle = "";
  if (typers.length) {
    subtitle =
      detail.kind === "direct"
        ? dict.messages.typing
        : dict.messages.typingName.replace("{name}", detail.people[typers[0]!]?.full_name.split(" ")[0] ?? "");
  } else if (detail.kind === "group") {
    const names = detail.memberIds
      .filter((id) => id !== myId)
      .map((id) => detail.people[id]?.full_name.split(" ")[0])
      .filter(Boolean)
      .join(", ");
    subtitle = names || dict.messages.members.replace("{count}", String(detail.memberIds.length));
  } else {
    subtitle = [detail.otherRole ? roleLabel(dict, detail.otherRole) : "", online ? dict.messages.online : ""].filter(Boolean).join(" · ");
  }

  const coarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const showSender = detail.kind === "group" || detail.oversight;

  return (
    <section className="ch-pane" aria-label={detail.title}>
      {/* header */}
      <header className="ch-head">
        <Link href="/messages" aria-label={dict.messages.back} className="ch-icon-btn ch-flip ch-only-narrow" style={{ marginInlineStart: -6 }}>
          <Icon name="arrow-left" />
        </Link>
        <ChatAvatar name={detail.title} url={detail.avatarUrl} group={detail.kind === "group"} size="sm" />

        {searching ? (
          <>
            <div className="ch-search ch-head-search">
              <Icon name="search" />
              <input
                ref={findInput}
                type="search"
                value={find}
                onChange={(e) => {
                  setFind(e.target.value);
                  setHit(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    setHit((h) => h + (e.shiftKey ? -1 : 1));
                  }
                }}
                placeholder={dict.messages.messageSearchPlaceholder}
                aria-label={dict.messages.searchInChat}
                autoComplete="off"
              />
            </div>
            {needle && (
              <span className="ch-head-count" aria-live="polite">
                {hits.length ? `${(((hit % hits.length) + hits.length) % hits.length) + 1} / ${hits.length}` : dict.messages.noMessageMatches}
              </span>
            )}
            <button type="button" className="ch-icon-btn" aria-label={dict.messages.closeSearch} onClick={closeSearch}>
              <Icon name="x" />
            </button>
          </>
        ) : (
          <>
            <div className="ch-head-title">
              <b>
                <bdi>{detail.title}</bdi>
              </b>
              <span className={typers.length ? "is-typing" : undefined}>{subtitle}</span>
            </div>
            <button type="button" className="ch-icon-btn ch-only-wide" aria-label={dict.messages.searchInChat} title={dict.messages.searchInChat} onClick={openSearch}>
              <Icon name="search" />
            </button>
            <div className="ch-menu-wrap ch-only-narrow" ref={headMenuAttach}>
              <button
                type="button"
                className="ch-icon-btn"
                aria-label={dict.messages.moreOptions}
                aria-haspopup="menu"
                aria-expanded={headMenuOpen}
                onClick={() => setHeadMenuOpen((o) => !o)}
              >
                <Icon name="dots" />
              </button>
              {headMenuOpen && (
                <div className="ch-pop" role="menu" style={{ insetBlockStart: 44, insetInlineEnd: 0 }}>
                  <button type="button" role="menuitem" onClick={openSearch}>
                    <Icon name="search" size={20} />
                    {dict.messages.searchInChat}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* messages */}
      <div className="ch-stage">
        <div
          ref={scroller}
          onScroll={() => {
            const near = nearBottom();
            atBottom.current = near;
            setShowJump(!near);
            if (near) setNewCount(0);
          }}
          className="ch-wall ch-scroll"
          role="log"
          aria-live="polite"
        >
          {hasMore && (
            <button type="button" className="ch-older" onClick={loadOlder} disabled={loadingOlder}>
              {dict.messages.loadEarlier}
            </button>
          )}

          {messages.length === 0 && <p className="ch-nomsg">{dict.messages.noMessages}</p>}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.senderId === myId;
            const newDay = !prev || fmt.dayKey(prev.createdAt) !== fmt.dayKey(m.createdAt);
            const sameRun = !newDay && prev?.senderId === m.senderId;
            const tick = mine ? tickFor(m, myId, detail.memberIds, receipts) : null;
            const sender = showSender && !mine && !sameRun ? detail.people[m.senderId]?.full_name ?? "—" : null;
            return (
              <Fragment key={m.clientId}>
                {newDay && <div className="ch-date">{fmt.dayLabel(m.createdAt)}</div>}
                {m.clientId === unread.id && (
                  <div className="ch-date is-unread" data-unread-divider>
                    {unread.count === 1 ? dict.messages.unreadMessage : dict.messages.unreadMessages.replace("{count}", String(unread.count))}
                  </div>
                )}
                {!newDay && !sameRun && prev && <div className="ch-gap" aria-hidden />}
                <div
                  data-mid={m.clientId}
                  className={`ch-msg ${mine ? "out" : "in"}${sameRun ? "" : " tail"}${m.status === "failed" ? " is-failed" : ""}${m.clientId === hitId ? " is-hit" : ""}`}
                >
                  {sender && (
                    <span className="ch-sender" style={{ color: senderColor(m.senderId) }}>
                      {sender}
                    </span>
                  )}
                  <div className="ch-msg-row">
                    {m.hidden ? (
                      <p className="ch-hidden-msg">
                        <Icon name="alert" size={16} />
                        {dict.messages.hiddenMessage}
                      </p>
                    ) : (
                      <MessageText text={m.content} find={needle} />
                    )}
                    <small className="ch-meta">
                      <time dateTime={m.createdAt}>{fmt.time(m.createdAt)}</time>
                      {tick && <Ticks tick={tick} />}
                    </small>
                  </div>
                </div>
                {m.status === "failed" && (
                  <button type="button" className="ch-retry" onClick={() => retry(m)}>
                    {m.error ?? dict.messages.failed}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>

        {showJump && (
          <button type="button" className="ch-jump" onClick={() => scrollToBottom(true)} aria-label={dict.messages.scrollToLatest} title={dict.messages.scrollToLatest}>
            <Icon name="chevron-down" />
            {newCount > 0 && <span className="ch-badge">{newCount > 99 ? "99+" : newCount}</span>}
          </button>
        )}
      </div>

      {/* composer */}
      <div className="ch-composer-wrap">
        {banner && (
          <p role="alert" className="ch-banner">
            {banner}
          </p>
        )}
        {detail.canSend ? (
          <form
            className="ch-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="ch-menu-wrap" ref={emojiAttach}>
              <button
                type="button"
                className="ch-icon-btn"
                aria-label={dict.messages.emoji}
                aria-haspopup="true"
                aria-expanded={emojiOpen}
                onClick={() => setEmojiOpen((o) => !o)}
              >
                <Icon name="smile" />
              </button>
              {emojiOpen && (
                <div className="ch-pop ch-emoji-grid" role="group" aria-label={dict.messages.emoji}>
                  {EMOJI.map((e) => (
                    <button key={e} type="button" onClick={() => insertEmoji(e)} aria-label={e}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label htmlFor="chat-input" className="sr-only">
              {dict.messages.typeMessage}
            </label>
            <textarea
              id="chat-input"
              ref={input}
              rows={1}
              value={text}
              maxLength={4000}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value) rt.sendTyping(chatId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarsePointer) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={dict.messages.typeMessage}
              dir="auto"
              className={`ch-input${multiline ? " is-multi" : ""}`}
            />
            <button
              type="submit"
              className="ch-send ch-flip"
              aria-label={dict.messages.send}
              title={dict.messages.send}
              disabled={!text.trim()}
              // keep focus (and the phone keyboard) in the text box on tap
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* re-keyed on every send so the paper-plane flight replays */}
              <span key={launch} className={`ch-send-plane${launch ? (launch % 2 ? " is-launch-a" : " is-launch-b") : ""}`}>
                <Icon name="send" />
              </span>
            </button>
          </form>
        ) : (
          <p className="ch-readonly">{detail.oversight ? dict.chatOversight.readOnly : dict.messages.readOnly}</p>
        )}
      </div>
    </section>
  );
}
