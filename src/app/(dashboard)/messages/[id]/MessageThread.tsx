"use client";

import { useActionState, useEffect, useRef } from "react";
import { ActionForm, useFormStatus } from "@/components/ui/ActionForm";
import { sendDmMessageAction, type ActionState } from "../actions";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DmMessage } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SendButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <button type="submit" disabled={pending} className="btn-primary shrink-0">
      {pending ? dict.common.submitting : dict.messages.send}
    </button>
  );
}

export function MessageThread({ conversationId, myId, messages }: { conversationId: string; myId: string; messages: DmMessage[] }) {
  const [state, formAction] = useActionState(sendDmMessageAction, initialState);
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
        {messages.length === 0 && <p className="text-center text-sm text-slate-400 dark:text-navy-500">{dict.messages.noMessages}</p>}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-navy-800 text-white dark:bg-navy-600"
                    : "bg-slate-100 text-slate-800 dark:bg-navy-800 dark:text-navy-100"
                }`}
              >
                <bdi dir="auto">{m.content}</bdi>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      <ActionForm ref={formRef} action={formAction} state={state} className="mt-3 flex gap-2">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input name="content" placeholder={dict.messages.typeMessage} required className="input flex-1" autoComplete="off" />
        <SendButton />
      </ActionForm>
    </div>
  );
}
