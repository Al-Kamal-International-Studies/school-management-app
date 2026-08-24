"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadAutismVideoAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.autismSection.uploading : dict.autismSection.upload}
    </Button>
  );
}

export function UploadVideoForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(uploadAutismVideoAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="student_id" value={studentId} />
      <Input label={dict.autismSection.videoTitleLabel} name="title" placeholder={dict.autismSection.videoTitlePlaceholder} />
      <div>
        <label htmlFor="file" className="label">
          {dict.autismSection.chooseFile}
        </label>
        <input id="file" name="file" type="file" accept="video/mp4,video/quicktime,video/webm" required className="input" />
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-navy-400">{dict.autismSection.uploadHint}</p>
      </div>
      <SubmitButton />
    </form>
  );
}
