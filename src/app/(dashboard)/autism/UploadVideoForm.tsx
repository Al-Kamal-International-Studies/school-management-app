"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareAutismVideoUploadAction, finalizeAutismVideoUploadAction } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Client-side friendly check only — kept in sync with actions.ts's
// MAX_VIDEO_BYTES and the 0039 migration's Storage bucket file_size_limit,
// which is the real, unbypassable enforcement layer.
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

/**
 * Uploads straight from the browser to Supabase Storage with a one-time signed
 * URL (see prepareAutismVideoUploadAction's doc comment for why it can't go
 * through a Server Action), then asks the server to record it.
 */
export function UploadVideoForm({ studentId }: { studentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { dict } = useLocale();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(dict.autismSection.chooseFile);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const prepared = await prepareAutismVideoUploadAction({
        student_id: studentId,
        file_type: file.type,
        file_size: file.size,
        file_name: file.name,
      });
      if (prepared.error || !prepared.path || !prepared.token) {
        setError(prepared.error ?? dict.autismSection.uploading);
        return;
      }

      const { error: uploadError } = await createClient()
        .storage.from("autism-videos")
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const title = String(data.get("title") ?? "").trim();
      const result = await finalizeAutismVideoUploadAction({ student_id: studentId, path: prepared.path, title: title || undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
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
      <Button type="submit" loading={busy}>
        {busy ? dict.autismSection.uploading : dict.autismSection.upload}
      </Button>
    </form>
  );
}
