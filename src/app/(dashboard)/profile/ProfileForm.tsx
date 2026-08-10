"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { updateOwnProfileAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Profile } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: ActionState = {};

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {pending ? dict.common.saving : dict.common.saveChanges}
    </Button>
  );
}

export function ProfileForm({ profile, dict }: { profile: Profile; dict: Dictionary }) {
  const [state, formAction] = useActionState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {dict.profilePage.updated}
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={dict.profilePage.fullName} name="full_name" defaultValue={profile.full_name} required />
        <Input label={dict.profilePage.phone} name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder={dict.common.notSet} />
      </div>

      {profile.role === "admin" ? (
        // Admins have full edit access to their own account, including
        // email and date of birth — every other role keeps these
        // read-only/admin-managed (see the grid below).
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.common.email} name="email" type="email" defaultValue={profile.email} required />
          <Input label={dict.adminUsers.dobOptional} name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="label">{dict.common.email}</span>
            <p className="input flex items-center bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-navy-400">{profile.email}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{dict.profilePage.emailChangeHint}</p>
          </div>
          <div>
            <span className="label">{dict.adminUsers.dobOptional}</span>
            <p className="input flex items-center bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-navy-400">
              {profile.date_of_birth
                ? new Date(profile.date_of_birth + "T00:00:00").toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : dict.common.notSet}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{dict.profilePage.dobChangeHint}</p>
          </div>
        </div>
      )}

      <SubmitButton dict={dict} />
    </form>
  );
}
