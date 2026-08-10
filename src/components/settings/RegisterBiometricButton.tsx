"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import {
  generateWebauthnRegistrationOptionsAction,
  verifyWebauthnRegistrationAction,
  removeWebauthnCredentialAction,
} from "@/app/(dashboard)/settings/webauthnActions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { WebauthnCredential } from "@/lib/types/database.types";

function RemoveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeWebauthnCredentialAction(id);
          router.refresh();
        })
      }
      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? dict.biometrics.removing : dict.biometrics.remove}
    </button>
  );
}

export function RegisterBiometricButton({ credentials }: { credentials: WebauthnCredential[] }) {
  const { dict } = useLocale();
  const router = useRouter();
  // Starts `null` (not a boolean) on purpose — the server can never know
  // whether this browser/device has a platform authenticator, so the first
  // client render must match the server's render exactly, same reasoning
  // as PushNotificationToggle's `supported` state.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) {
        setSupported(false);
        return;
      }
      setSupported(await platformAuthenticatorIsAvailable());
    });
  }, []);

  async function handleRegister() {
    setError(null);
    setPending(true);
    try {
      const optionsResult = await generateWebauthnRegistrationOptionsAction();
      if (optionsResult.error || !optionsResult.options) {
        setError(optionsResult.error ?? "Could not start registration.");
        return;
      }
      const optionsJSON: PublicKeyCredentialCreationOptionsJSON = JSON.parse(optionsResult.options);
      const response = await startRegistration({ optionsJSON });
      const label = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : "This device";
      const verifyResult = await verifyWebauthnRegistrationAction(response, label);
      if (verifyResult.error) {
        setError(verifyResult.error);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.biometrics.verificationFailed);
    } finally {
      setPending(false);
    }
  }

  if (supported === null) return null;

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}

      {credentials.length > 0 && (
        <ul className="space-y-2.5">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-navy-700 dark:bg-navy-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                  <Fingerprint className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.label}</p>
                  <p className="text-xs text-slate-400 dark:text-navy-500">
                    {c.last_used_at ? `${dict.biometrics.lastUsed}: ${new Date(c.last_used_at).toLocaleString()}` : dict.biometrics.neverUsed}
                  </p>
                </div>
              </div>
              <RemoveButton id={c.id} />
            </li>
          ))}
        </ul>
      )}

      {!supported ? (
        credentials.length === 0 && <p className="text-sm text-slate-500 dark:text-navy-400">{dict.biometrics.notSupported}</p>
      ) : (
        <Button type="button" variant="secondary" onClick={handleRegister} loading={pending}>
          <Fingerprint className="h-4 w-4" />
          {pending ? dict.biometrics.settingUp : dict.biometrics.setUp}
        </Button>
      )}
    </div>
  );
}
