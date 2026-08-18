"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendChannelMessageAction, type ActionState } from "../actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { SubjectChatMessage } from "@/lib/types/database.types";

const initialState: ActionState = {};

// Matches http(s) URLs so a pasted meeting link (Google Meet, Zoom, etc.)
// renders as a real clickable link instead of plain text — the whole point
// of this feature per Muhammad's ask (2026-08-18, see HANDOVER.md Part 7).
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        URL_PATTERN.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        )
      )}
    </>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <button type="submit" disabled={pending} className="btn-primary shrink-0">
      {pending ? dict.common.submitting : dict.classChat.send}
    </button>
  );
}

type Message = SubjectChatMessage & { sender: { id: string; full_name: string; role: string } | null };

export function ChannelThread({
  channelId,
  myId,
  isTeacher,
  messages,
}: {
  channelId: string;
  myId: string;
  isTeacher: boolean;
  messages: Message[];
}) {
  const [state, formAction] = useActionState(sendChannelMessageAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-[65vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {messages.length === 0 && <p className="text-center text-sm text-slate-400 dark:text-navy-500">{dict.classChat.noMessages}</p>}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {!mine && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-navy-400">{m.sender?.full_name ?? dict.common.unknown}</span>
                    {m.sender?.role === "teacher" && <Badge tone="gold">{dict.classChat.teacherBadge}</Badge>}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? "bg-navy-800 text-white dark:bg-navy-600" : "bg-slate-100 text-slate-800 dark:bg-navy-800 dark:text-navy-100"
                  }`}
                >
                  <Linkified text={m.content} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form ref={formRef} action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="channel_id" value={channelId} />
        <input
          name="content"
          placeholder={isTeacher ? dict.classChat.typeMessageTeacher : dict.classChat.typeMessage}
          required
          className="input flex-1"
          autoComplete="off"
        />
        <SendButton />
      </form>
    </div>
  );
}
