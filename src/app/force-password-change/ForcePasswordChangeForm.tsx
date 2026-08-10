"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { completeForcedPasswordChangeAction, type ActionState } from "./actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      {pending ? dict.forcePasswordChange.saving : dict.forcePasswordChange.continueButton}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}

export function ForcePasswordChangeForm({ minLength }: { minLength: number }) {
  const [state, formAction] = useActionState(completeForcedPasswordChangeAction, initialState);
  const { dict } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.replace("/");
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
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
      <SubmitButton />
    </form>
  );
}
