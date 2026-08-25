"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadAutismVideoAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

// Client-side friendly check only — kept in sync with actions.ts's
// MAX_VIDEO_BYTES and the 0039 migration's Storage bucket file_size_limit,
// which is the real, unbypassable enforcement layer.
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

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
      <FileUpload
        label={dict.autismSection.chooseFile}
        name="file"
        accept="video/mp4,video/quicktime,video/webm"
        required
        hint={dict.autismSection.uploadHint}
        maxSizeBytes={MAX_VIDEO_BYTES}
        tooLargeMessage={dict.autismSection.fileTooLarge}
        invalidTypeMessage={dict.autismSection.wrongFileType}
        dropzoneLabel={dict.autismSection.videoDropHint}
        removeLabel={dict.autismSection.remove}
      />
      <SubmitButton />
    </form>
  );
}
