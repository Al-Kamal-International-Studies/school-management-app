"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadDocumentAction, type ActionState } from "./actions";
import { Input, Select } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.common.submitting : dict.documents.upload}
    </Button>
  );
}

export function UploadForm({ students }: { students: { id: string; full_name: string }[] }) {
  const [state, formAction] = useActionState(uploadDocumentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Input label={dict.announcements.heading} name="title" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label={dict.documents.category} name="category" defaultValue="general">
          <option value="admit_card">{dict.documents.admitCard}</option>
          <option value="report_card">{dict.documents.reportCard}</option>
          <option value="certificate">{dict.documents.certificate}</option>
          <option value="policy">{dict.documents.policy}</option>
          <option value="general">{dict.documents.general}</option>
        </Select>
        <Select label={dict.announcements.audience} name="audience" defaultValue="all">
          <option value="all">{dict.announcements.audienceAll}</option>
          <option value="teacher">{dict.announcements.audienceTeacher}</option>
          <option value="student">{dict.announcements.audienceStudent}</option>
          <option value="parent">{dict.announcements.audienceParent}</option>
        </Select>
      </div>
      <Select label={dict.documents.forStudent} name="student_id" defaultValue="">
        <option value="">{dict.documents.anyStudent}</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </Select>
      <FileUpload
        label={dict.documents.file}
        name="file"
        required
        dropzoneLabel={dict.documents.fileDropHint}
        removeLabel={dict.documents.removeFile}
      />
      <SubmitButton />
    </form>
  );
}
