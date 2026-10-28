"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatReceipt } from "@/lib/types/database.types";

type ChatEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "receipt"; receipt: ChatReceipt }
  | { type: "read"; chatId: string }
  /** the live connection dropped and came back: refetch anything missed */
  | { type: "resync" };

type Listener = (e: ChatEvent) => void;

interface ChatRealtime {
  myId: string;
  unreadTotal: number;
  online: ReadonlySet<string>;
  /** chatId -> userId -> expiry (ms) */
  typing: ReadonlyMap<string, ReadonlyMap<string, number>>;
  subscribe: (fn: Listener) => () => void;
  sendTyping: (chatId: string) => void;
  markRead: (chatId: string, upTo: string) => void;
  /** the chat currently on screen (its new messages don't count as unread) */
  setActiveChat: (chatId: string | null) => void;
}

const Ctx = createContext<ChatRealtime | null>(null);

const TYPING_TTL = 4000;

/** Wraps an async job so overlapping calls collapse into at most one extra run. */
function coalesce(job: () => Promise<void>): () => void {
  let running = false;
  let again = false;
  const run = () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    void job().finally(() => {
      running = false;
      if (again) {
        again = false;
        run();
      }
    });
  };
  return run;
}

/**
 * One Supabase Realtime connection for the whole dashboard (HANDOVER Part 42):
 *  - new chat_messages and chat_receipts rows (RLS decides what each user gets)
 *  - presence ("online") and typing broadcasts
 * It also acknowledges delivery: whenever this browser receives messages it
 * calls mark_all_delivered(), which is what turns the sender's ✓ into ✓✓.
 */
export function ChatRealtimeProvider({ myId, initialUnread, children }: { myId: string; initialUnread: number; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [unreadTotal, setUnreadTotal] = useState(initialUnread);
  const [online, setOnline] = useState<ReadonlySet<string>>(new Set());
  const [typing, setTyping] = useState<Map<string, Map<string, number>>>(new Map());
  const listeners = useRef(new Set<Listener>());
  const activeChat = useRef<string | null>(null);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const emit = useCallback((e: ChatEvent) => listeners.current.forEach((fn) => fn(e)), []);

  // No setTimeout debouncing here: background tabs hold timers back for up to
  // a minute, which would delay the sender's ✓✓. coalesce() runs at once and
  // folds calls made while one is in flight into a single follow-up.
  const refreshUnread = useMemo(
    () =>
      coalesce(async () => {
        const { data } = await supabase.rpc("my_unread_total");
        if (typeof data === "number") setUnreadTotal(data);
      }),
    [supabase]
  );

  const acknowledgeDelivery = useMemo(() => coalesce(async () => void (await supabase.rpc("mark_all_delivered"))), [supabase]);

  useEffect(() => {
    let cancelled = false;
    let wasSubscribed = false;
    let db: ReturnType<typeof supabase.channel> | null = null;
    let presence: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      db = supabase
        .channel(`chat-db:${myId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          const message = payload.new as ChatMessage;
          emit({ type: "message", message });
          if (message.sender_id !== myId) {
            acknowledgeDelivery();
            // authoritative recount, no optimistic +1: the chat overseer also
            // receives other people's messages here (Part 43)
            refreshUnread();
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_receipts" }, (payload) => {
          if (payload.new && "chat_id" in payload.new) emit({ type: "receipt", receipt: payload.new as ChatReceipt });
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (wasSubscribed) {
            emit({ type: "resync" });
            refreshUnread();
          }
          wasSubscribed = true;
          acknowledgeDelivery();
        });

      presence = supabase.channel("akis-presence", { config: { presence: { key: myId } } });
      presenceRef.current = presence;
      presence
        .on("presence", { event: "sync" }, () => {
          setOnline(new Set(Object.keys(presence!.presenceState())));
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const { chatId, userId } = payload as { chatId: string; userId: string };
          if (userId === myId) return;
          setTyping((prev) => {
            const next = new Map(prev);
            next.set(chatId, new Map(next.get(chatId) ?? []).set(userId, Date.now() + TYPING_TTL));
            return next;
          });
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void presence!.track({ at: Date.now() });
        });
    })();

    // Coming back to the app (unlocked phone, switched tab): the socket may
    // have been closed while hidden, so re-sync rather than trust it.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      emit({ type: "resync" });
      acknowledgeDelivery();
      refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (db) void supabase.removeChannel(db);
      if (presence) void supabase.removeChannel(presence);
      presenceRef.current = null;
    };
  }, [supabase, myId, emit, acknowledgeDelivery, refreshUnread]);

  // expire stale "typing…" entries
  useEffect(() => {
    if (typing.size === 0) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((prev) => {
        let changed = false;
        const next = new Map<string, Map<string, number>>();
        for (const [chat, users] of prev) {
          const live = new Map([...users].filter(([, exp]) => exp > now));
          if (live.size !== users.size) changed = true;
          if (live.size) next.set(chat, live);
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [typing.size]);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => void listeners.current.delete(fn);
  }, []);

  const lastTypingSent = useRef(0);
  const sendTyping = useCallback(
    (chatId: string) => {
      const now = Date.now();
      if (now - lastTypingSent.current < 2000) return;
      lastTypingSent.current = now;
      void presenceRef.current?.send({ type: "broadcast", event: "typing", payload: { chatId, userId: myId } });
    },
    [myId]
  );

  const markRead = useCallback(
    (chatId: string, upTo: string) => {
      emit({ type: "read", chatId });
      void supabase.rpc("mark_chat_read", { p_chat_id: chatId, p_up_to: upTo }).then(() => refreshUnread());
    },
    [supabase, emit, refreshUnread]
  );

  const setActiveChat = useCallback((chatId: string | null) => {
    activeChat.current = chatId;
  }, []);

  const value = useMemo<ChatRealtime>(
    () => ({ myId, unreadTotal, online, typing, subscribe, sendTyping, markRead, setActiveChat }),
    [myId, unreadTotal, online, typing, subscribe, sendTyping, markRead, setActiveChat]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatRealtime(): ChatRealtime {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChatRealtime must be used inside ChatRealtimeProvider");
  return ctx;
}
