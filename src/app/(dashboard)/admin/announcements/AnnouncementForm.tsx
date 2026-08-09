"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createAnnouncementAction, type ActionState } from "./actions";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.common.submitting : dict.common.submit}
    </Button>
  );
}

export function AnnouncementForm() {
  const [state, formAction] = useActionState(createAnnouncementAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Input label={dict.announcements.heading} name="title" required />
      <Textarea label={dict.announcements.body} name="body" required />
      <Select label={dict.announcements.audience} name="audience" defaultValue="all">
        <option value="all">{dict.announcements.audienceAll}</option>
        <option value="teacher">{dict.announcements.audienceTeacher}</option>
        <option value="student">{dict.announcements.audienceStudent}</option>
      </Select>
      <SubmitButton />
    </form>
  );
}
