"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { submitFeedbackAction, type ActionState } from "./actions";
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

export function FeedbackForm() {
  const [state, formAction] = useActionState(submitFeedbackAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {dict.feedback.submitted}
          </span>
        </Alert>
      )}

      <Select label={dict.feedback.category} name="category" defaultValue="general">
        <option value="technical">{dict.feedback.categoryTechnical}</option>
        <option value="academic">{dict.feedback.categoryAcademic}</option>
        <option value="suggestion">{dict.feedback.categorySuggestion}</option>
        <option value="general">{dict.feedback.categoryGeneral}</option>
      </Select>

      <Input label={dict.feedback.subject} name="subject" required />
      <Textarea label={dict.feedback.message} name="message" rows={5} required />

      <SubmitButton />
    </form>
  );
}
