"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Loader2, SendHorizontal, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { roleLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/client";
import { useChatRealtime } from "@/components/chat/ChatRealtimeProvider";
import { ChatAvatar, MessageText, Ticks, useChatTime } from "@/components/chat/parts";
import { loadMessagesAction } from "@/app/(dashboard)/messages/actions";
import { tickFor, type ChatDetail, type UiMessage } from "@/lib/chat/types";
import type { ChatMessage, ChatReceipt } from "@/lib/types/database.types";

const NEAR_BOTTOM_PX = 120;
const GROUP_GAP_MS = 5 * 60 * 1000;

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
  const [banner, setBanner] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const prependAnchor = useRef<number | null>(null);
  const lastMarked = useRef<string | null>(null);
  const stickToBottom = useRef(true);
  const messagesRef = useRef(messages);
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
          stickToBottom.current = e.message.sender_id === myId || nearBottom();
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
    if (prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
      return;
    }
    if (stickToBottom.current) scrollToBottom(false);
    else setShowJump(true);
  }, [messages.length]);

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
    stickToBottom.current = true;
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

  // auto-grow the composer up to ~6 lines
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  // ---- header subtitle: typing… > online > group info > role ----
  const typers = [...(rt.typing.get(chatId)?.keys() ?? [])];
  let subtitle = detail.otherRole ? roleLabel(dict, detail.otherRole) : "";
  if (typers.length) {
    subtitle =
      detail.kind === "direct"
        ? dict.messages.typing
        : dict.messages.typingName.replace("{name}", detail.people[typers[0]!]?.full_name.split(" ")[0] ?? "");
  } else if (detail.otherId && rt.online.has(detail.otherId)) {
    subtitle = dict.messages.online;
  } else if (detail.kind === "group") {
    subtitle = [detail.subtitle && dict.messages.taughtBy.replace("{teacher}", detail.subtitle), dict.messages.members.replace("{count}", String(detail.memberIds.length))]
      .filter(Boolean)
      .join(" · ");
  }

  const coarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-2 dark:border-navy-800 sm:px-4">
        <Link
          href="/messages"
          aria-label={dict.messages.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-navy-300 dark:hover:bg-white/10 lg:hidden"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
        </Link>
        <ChatAvatar name={detail.title} url={detail.avatarUrl} group={detail.kind === "group"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{detail.title}</p>
          <p className={cn("truncate text-xs", typers.length ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-navy-400")}>{subtitle}</p>
        </div>
      </header>

      {/* messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={() => nearBottom() && setShowJump(false)}
          className="h-full overflow-y-auto bg-slate-50 px-3 py-4 dark:bg-navy-950 sm:px-6"
          role="log"
          aria-live="polite"
        >
          {hasMore && (
            <div className="mb-4 flex justify-center">
              <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn-secondary h-9 text-xs">
                {loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {dict.messages.loadEarlier}
              </button>
            </div>
          )}

          {messages.length === 0 && <p className="mt-10 text-center text-sm text-slate-500 dark:text-navy-400">{dict.messages.noMessages}</p>}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.senderId === myId;
            const newDay = !prev || fmt.dayKey(prev.createdAt) !== fmt.dayKey(m.createdAt);
            const sameRun = !newDay && prev?.senderId === m.senderId && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_GAP_MS;
            const showName = (detail.kind === "group" || detail.oversight) && !mine && !sameRun;
            const tick = mine ? tickFor(m, myId, detail.memberIds, receipts) : null;
            return (
              <Fragment key={m.clientId}>
                {newDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-card dark:bg-navy-900 dark:text-navy-300">
                      {fmt.dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div className={cn("flex", mine ? "justify-end" : "justify-start", sameRun ? "mt-0.5" : "mt-2")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 pb-1.5 pt-2 text-sm shadow-card sm:max-w-[70%]",
                      mine ? "bg-navy-800 text-white dark:bg-navy-700" : "border border-slate-200 bg-white text-slate-900 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100",
                      m.status === "failed" && "opacity-80"
                    )}
                  >
                    {showName && (
                      <p className="mb-0.5 text-xs font-semibold text-navy-700 dark:text-navy-200">{detail.people[m.senderId]?.full_name ?? "—"}</p>
                    )}
                    {m.hidden ? (
                      <p className="flex items-center gap-1.5 italic text-slate-500 dark:text-navy-400">
                        <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        {dict.messages.hiddenMessage}
                      </p>
                    ) : (
                      <MessageText text={m.content} mine={mine} />
                    )}
                    <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[11px] tabular", mine ? "text-white/70" : "text-slate-400 dark:text-navy-400")}>
                      {fmt.time(m.createdAt)}
                      {tick && <Ticks tick={tick} onDark />}
                    </span>
                  </div>
                </div>
                {m.status === "failed" && (
                  <div className="mt-1 flex justify-end">
                    <button type="button" onClick={() => retry(m)} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
                      {m.error ?? dict.messages.failed}
                    </button>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {showJump && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 start-1/2 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-navy-800 shadow-overlay rtl:translate-x-1/2 dark:bg-navy-800 dark:text-white"
          >
            <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
            {dict.messages.newBelow}
          </button>
        )}
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 dark:border-navy-800 dark:bg-navy-950 sm:px-4">
        {banner && (
          <p role="alert" className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            {banner}
          </p>
        )}
        {detail.canSend ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
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
              className="input max-h-36 min-h-[44px] flex-1 resize-none py-2.5 leading-5"
            />
            <button type="submit" aria-label={dict.messages.send} disabled={!text.trim()} className="btn-primary h-11 w-11 shrink-0 p-0">
              <SendHorizontal className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
            </button>
          </form>
        ) : (
          <p className="py-2 text-center text-sm text-slate-500 dark:text-navy-400">
            {detail.oversight ? dict.chatOversight.readOnly : dict.messages.readOnly}
          </p>
        )}
      </div>
    </div>
  );
}
