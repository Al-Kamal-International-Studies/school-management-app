"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { changeOwnPasswordAction, type ActionState } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialState);
  const { dict } = useLocale();

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" /> {dict.settings.passwordUpdated}
          </span>
        </Alert>
      )}
      <Input
        label={dict.settings.newPassword}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Input
        label={dict.settings.confirmPassword}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <SubmitButton label={dict.common.save} pendingLabel={dict.common.saving} />
    </form>
  );
}
