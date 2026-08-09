"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { updateOwnProfileAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Profile } from "@/lib/types/database.types";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            Profile updated.
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full name" name="full_name" defaultValue={profile.full_name} required />
        <Input label="Phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="Not set" />
      </div>

      {profile.role === "admin" ? (
        // Admins have full edit access to their own account, including
        // email and date of birth — every other role keeps these
        // read-only/admin-managed (see the grid below).
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email" name="email" type="email" defaultValue={profile.email} required />
          <Input label="Date of birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="label">Email</span>
            <p className="input flex items-center bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-navy-400">{profile.email}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">Contact your administrator to change your login email.</p>
          </div>
          <div>
            <span className="label">Date of birth</span>
            <p className="input flex items-center bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-navy-400">
              {profile.date_of_birth
                ? new Date(profile.date_of_birth + "T00:00:00").toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not set"}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">Contact your administrator to update this.</p>
          </div>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
