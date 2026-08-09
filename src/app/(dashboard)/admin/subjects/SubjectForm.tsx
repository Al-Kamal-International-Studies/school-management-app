"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createSubjectAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add subject"}
    </Button>
  );
}

export function SubjectForm() {
  const [state, formAction] = useActionState(createSubjectAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a successful submission (no error in state).
  useEffect(() => {
    if (!state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {state.error && (
        <div className="basis-full">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}
      <div className="w-full sm:w-56">
        <Input label="Subject name" name="name" placeholder="Mathematics" required />
      </div>
      <div className="w-full sm:w-32">
        <Input label="Code" name="code" placeholder="MATH" required />
      </div>
      <SubmitButton />
    </form>
  );
}
