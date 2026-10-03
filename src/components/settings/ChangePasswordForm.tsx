"use client";

import { useActionState } from "react";
import { ActionForm, useFormStatus } from "@/components/ui/ActionForm";
import { Check } from "lucide-react";
import { changeOwnPasswordAction, type ActionState } from "@/app/(dashboard)/settings/actions";
import { PasswordField } from "@/components/ui/PasswordField";
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

export function ChangePasswordForm({ minLength = 12 }: { minLength?: number }) {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialState);
  const { dict } = useLocale();

  return (
    <ActionForm action={formAction} state={state} resetOnSuccess className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" /> {dict.settings.passwordUpdated}
          </span>
        </Alert>
      )}
      <PasswordField
        label={dict.settings.currentPassword}
        name="currentPassword"
        autoComplete="current-password"
        required
        showLabel={dict.login.showPassword}
        hideLabel={dict.login.hidePassword}
      />
      <PasswordField
        label={dict.settings.newPassword}
        name="password"
        autoComplete="new-password"
        minLength={minLength}
        required
        showLabel={dict.login.showPassword}
        hideLabel={dict.login.hidePassword}
      />
      <PasswordField
        label={dict.settings.confirmPassword}
        name="confirmPassword"
        autoComplete="new-password"
        minLength={minLength}
        required
        showLabel={dict.login.showPassword}
        hideLabel={dict.login.hidePassword}
      />
      <SubmitButton label={dict.common.save} pendingLabel={dict.common.saving} />
    </ActionForm>
  );
}
