"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Wand2 } from "lucide-react";
import { adminSetUserPasswordAction, type ActionState } from "../actions";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: ActionState = {};

// Excludes visually-ambiguous characters (0/O, 1/l/I) — this is read and
// retyped by a human relaying it to the account holder, unlike a normal
// user-chosen password.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length = 16): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.adminUsers.savingPassword : dict.adminUsers.savePassword}
    </Button>
  );
}

export function AdminSetPasswordForm({ userId, minLength }: { userId: string; minLength: number }) {
  const [state, formAction] = useActionState(adminSetUserPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const { dict } = useLocale();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={userId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" /> {dict.adminUsers.passwordSet}
          </span>
        </Alert>
      )}
      <p className="text-xs text-slate-500 dark:text-navy-400">{dict.adminUsers.setPasswordDescription}</p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <PasswordField
            label={dict.adminUsers.tempPassword}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={minLength}
            required
            showLabel={dict.login.showPassword}
            hideLabel={dict.login.hidePassword}
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())} className="mb-0.5">
          <Wand2 className="h-4 w-4" />
          {dict.adminUsers.generate}
        </Button>
      </div>
      <SubmitButton />
    </form>
  );
}
