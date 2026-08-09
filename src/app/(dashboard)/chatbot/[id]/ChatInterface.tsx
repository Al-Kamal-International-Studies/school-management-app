"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";
import { sendMessageAction } from "../actions";
import { PERSONAS } from "@/lib/chatbot/personas";
import { CHATBOT_MESSAGE_LIMIT } from "@/lib/chatbot/constants";
import { cn } from "@/lib/utils";
import type { ChatbotConversation, ChatbotMessage } from "@/lib/types/database.types";

interface DisplayMessage extends Pick<ChatbotMessage, "id" | "role" | "content" | "created_at"> {}

export function ChatInterface({
  conversation,
  initialMessages,
  initialUserMessageCount,
}: {
  conversation: ChatbotConversation;
  initialMessages: ChatbotMessage[];
  initialUserMessageCount: number;
}) {
  const persona = PERSONAS[conversation.persona];
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [userMessageCount, setUserMessageCount] = useState(initialUserMessageCount);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const atLimit = userMessageCount >= CHATBOT_MESSAGE_LIMIT;
  const remaining = CHATBOT_MESSAGE_LIMIT - userMessageCount;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || atLimit) return;

    setError(undefined);
    setSending(true);
    setInput("");

    const optimisticUser: DisplayMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    const formData = new FormData();
    formData.set("conversation_id", conversation.id);
    formData.set("content", content);

    const result = await sendMessageAction({}, formData);
    setSending(false);

    if (result.error) {
      setError(result.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      return;
    }

    setUserMessageCount((c) => c + 1);
    if (result.reply) {
      setMessages((prev) => [
        ...prev,
        { id: `local-reply-${Date.now()}`, role: "assistant", content: result.reply!, created_at: new Date().toISOString() },
      ]);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-navy-800 pb-4">
        <Link href="/chatbot" className="rounded-lg p-1.5 text-slate-500 dark:text-navy-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={persona.avatarSrc} alt={persona.name} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-navy-900 dark:text-white">{persona.name}</p>
          <p className="text-xs text-slate-400 dark:text-navy-500">{persona.role}</p>
        </div>
        <Link
          href="/chatbot"
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:bg-navy-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New chat
        </Link>
      </div>

      {/* Message limit bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-navy-400">
          <span>Conversation length</span>
          <span className={cn(atLimit && "font-medium text-red-600")}>
            {userMessageCount} / {CHATBOT_MESSAGE_LIMIT} messages
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={cn("h-full rounded-full", atLimit ? "bg-red-500" : "bg-gold-gradient")}
            initial={false}
            animate={{ width: `${Math.min(100, (userMessageCount / CHATBOT_MESSAGE_LIMIT) * 100)}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="my-4 flex-1 space-y-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-sm bg-navy-800 text-white"
                    : "rounded-bl-sm border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 text-slate-700 dark:text-navy-100"
                )}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {/* Input */}
      {atLimit ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:bg-navy-800/40 p-4 text-center">
          <p className="text-sm text-slate-600">You've reached this conversation's message limit.</p>
          <Link href="/chatbot" className="mt-2 inline-block text-sm font-medium text-navy-600 hover:text-navy-800">
            Start a new conversation →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${persona.name} about the app…`}
            maxLength={500}
            disabled={sending}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary shrink-0 px-3.5"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-navy-500">
        {remaining > 0 ? `${remaining} message${remaining === 1 ? "" : "s"} left in this conversation` : ""} · App
        questions only — not for personal or sensitive information.
      </p>
    </div>
  );
}
