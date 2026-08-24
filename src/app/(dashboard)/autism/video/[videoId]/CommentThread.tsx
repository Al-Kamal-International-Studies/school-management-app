"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { postAutismCommentAction, type ActionState } from "../../actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AutismVideoComment } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SendButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <button type="submit" disabled={pending} className="btn-primary shrink-0">
      {pending ? dict.common.submitting : dict.autismSection.postComment}
    </button>
  );
}

type Comment = AutismVideoComment & { author: { id: string; full_name: string; role: string } | null };

/**
 * Mirrors class-chat's ChannelThread.tsx (useActionState/useFormStatus,
 * auto-scroll to bottom). `canComment` is computed server-side by the
 * parent page (getAutismVideoDetail) and passed down — an admin viewing
 * this thread never gets a comment box, per the view-only product decision
 * (see 0033_autism_section.sql's can_comment_on_autism_video()).
 */
export function CommentThread({ videoId, myId, canComment, comments }: { videoId: string; myId: string; canComment: boolean; comments: Comment[] }) {
  const [state, formAction] = useActionState(postAutismCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  return (
    <div className="flex h-[55vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {comments.length === 0 && <p className="text-center text-sm text-slate-400 dark:text-navy-500">{dict.autismSection.noComments}</p>}
        {comments.map((c) => {
          const mine = c.author_id === myId;
          return (
            <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {!mine && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-navy-400">{c.author?.full_name ?? dict.common.unknown}</span>
                    {c.author?.role === "teacher" && <Badge tone="gold">{dict.classChat.teacherBadge}</Badge>}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? "bg-navy-800 text-white dark:bg-navy-600" : "bg-slate-100 text-slate-800 dark:bg-navy-800 dark:text-navy-100"
                  }`}
                >
                  <span className="whitespace-pre-wrap">{c.content}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canComment && (
        <>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <form ref={formRef} action={formAction} className="mt-3 flex gap-2">
            <input type="hidden" name="video_id" value={videoId} />
            <input name="content" placeholder={dict.autismSection.addCommentPlaceholder} required className="input flex-1" autoComplete="off" />
            <SendButton />
          </form>
        </>
      )}
      {!canComment && <p className="mt-3 text-center text-xs text-slate-400 dark:text-navy-500">{dict.autismSection.adminViewOnly}</p>}
    </div>
  );
}
