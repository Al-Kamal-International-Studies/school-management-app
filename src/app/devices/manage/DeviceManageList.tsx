"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Laptop, Trash2, ArrowRight, MapPin, ArrowLeft } from "lucide-react";
import { removeDeviceAction, registerCurrentDeviceAction, signOutToLoginAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { UserDevice } from "@/lib/types/database.types";

const MAX_DEVICES = 3;

/** Red "Remove" button, right-aligned at the end of each device row — the
 * one destructive action on this page, and the reason a device row reads
 * as "account device and location, then a way to remove it" left to right
 * (right-to-left in Arabic, `justify-between` flips with `dir` for free). */
function RemoveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeDeviceAction(id))}
      className="flex shrink-0 items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? dict.devices.removing : dict.devices.remove}
    </button>
  );
}

function ContinueButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { dict } = useLocale();
  return (
    <Button type="submit" className="w-full" loading={pending} disabled={disabled}>
      {pending ? dict.devices.continuing : dict.devices.continueOnThisDevice}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}

/** The escape hatch — signs this still-live session out and returns to
 * /login (signOutToLoginAction), for anyone who'd rather walk away than
 * decide which device to remove right now. */
function BackToLoginButton() {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutToLoginAction())}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-700 disabled:opacity-50 dark:text-navy-400 dark:hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {dict.devices.backToLogin}
    </button>
  );
}

const initialState: ActionState = {};

export function DeviceManageList({ devices, currentDeviceId }: { devices: UserDevice[]; currentDeviceId?: string }) {
  const [state, formAction] = useActionState(registerCurrentDeviceAction, initialState);
  const { dict } = useLocale();
  const atCap = devices.length >= MAX_DEVICES;

  return (
    <div className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {devices.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{dict.devices.noDevicesYet}</p>
      ) : (
        <ul className="space-y-2.5">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-navy-700 dark:bg-navy-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                  <Laptop className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {d.label ?? dict.common.unknown}
                    {d.device_id === currentDeviceId && (
                      <span className="ms-2 text-xs font-normal text-gold-600 dark:text-gold-400">({dict.devices.thisDevice})</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-navy-500">
                    {dict.devices.lastActive}: {new Date(d.last_seen_at).toLocaleString()}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 dark:text-navy-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{d.location ?? dict.devices.unknownLocation}</span>
                  </p>
                </div>
              </div>
              <RemoveButton id={d.id} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction}>
        <ContinueButton disabled={atCap} />
      </form>

      <div className="flex justify-center pt-1">
        <BackToLoginButton />
      </div>
    </div>
  );
}
