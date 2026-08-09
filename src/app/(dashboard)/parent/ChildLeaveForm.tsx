"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitChildLeaveRequestAction, type ActionState } from "./actions";
import { Input, Textarea } from "@/components/ui/Field";
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

export function ChildLeaveForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(submitChildLeaveRequestAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { dict } = useLocale();

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{dict.common.save} ✓</Alert>}
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.leave.startDate} name="start_date" type="date" required />
        <Input label={dict.leave.endDate} name="end_date" type="date" required />
      </div>
      <Textarea label={dict.leave.reason} name="reason" required />
      <SubmitButton />
    </form>
  );
}
