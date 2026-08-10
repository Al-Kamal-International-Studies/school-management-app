"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createEventAction, type ActionState } from "./actions";
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

export function EventForm() {
  const [state, formAction] = useActionState(createEventAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Input label={dict.announcements.heading} name="title" required />
      <Textarea label={dict.announcements.body} name="description" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label={dict.calendar.eventDate} name="event_date" type="date" required />
        <Select label={dict.calendar.eventType} name="event_type" defaultValue="event">
          <option value="event">{dict.calendar.event}</option>
          <option value="holiday">{dict.calendar.holiday}</option>
          <option value="deadline">{dict.calendar.deadline}</option>
        </Select>
        <Select label={dict.announcements.audience} name="audience" defaultValue="all">
          <option value="all">{dict.announcements.audienceAll}</option>
          <option value="teacher">{dict.announcements.audienceTeacher}</option>
          <option value="student">{dict.announcements.audienceStudent}</option>
          <option value="parent">{dict.announcements.audienceParent}</option>
        </Select>
      </div>
      <SubmitButton />
    </form>
  );
}
