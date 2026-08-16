"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Fingerprint, Laptop2, ScanFace, type LucideIcon } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { generateWebauthnRegistrationOptionsAction, verifyWebauthnRegistrationAction } from "@/app/(dashboard)/settings/webauthnActions";
import { dismissPasskeyPromptAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { detectPasskeyDeviceKind, type PasskeyDeviceKind } from "@/lib/deviceDetection";

const ICONS: Record<PasskeyDeviceKind, LucideIcon> = {
  ios: ScanFace,
  android: Fingerprint,
  desktop: Laptop2,
};

const REGISTRATION_LABEL: Record<PasskeyDeviceKind, string> = {
  ios: "iPhone/iPad",
  android: "Android device",
  desktop: "This device",
};

/**
 * The one-time, skippable passkey nudge shown at /setup-passkey (reached via
 * requireRole()'s requirePasskeyPromptResolved gate — see lib/auth.ts).
 * "Set up now" runs through the exact same two Server Actions Settings'
 * RegisterBiometricButton uses (generateWebauthnRegistrationOptionsAction /
 * verifyWebauthnRegistrationAction) — deliberately not reimplemented here,
 * per this project's "no hand-rolled cryptography" rule (the actual
 * WebAuthn verification lives entirely in those actions / @simplewebauthn).
 */
export function PasskeySetupPrompt({ dashboardPath }: { dashboardPath: string }) {
  const { dict } = useLocale();
  const router = useRouter();

  // Defaults to "desktop" — the safe, generic fallback — the instant this
  // effect can run; device-family detection is inherently heuristic (no
  // browser API guarantees it), so a brief default-then-corrected label is
  // expected and acceptable, not a bug to hide behind a null render.
  const [deviceKind, setDeviceKind] = useState<PasskeyDeviceKind>("desktop");
  // Starts `null` (not boolean) on purpose — the server can never know
  // whether this browser/device has a platform authenticator, so the first
  // client render must match the server's exactly. Same pattern as
  // RegisterBiometricButton's `supported` state.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [skipping, startSkipTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Both setState calls deferred into the microtask callback (not called
    // synchronously in the effect body) — same pattern as
    // RegisterBiometricButton, satisfies react-hooks/set-state-in-effect.
    queueMicrotask(async () => {
      setDeviceKind(detectPasskeyDeviceKind());
      const { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) {
        setSupported(false);
        return;
      }
      setSupported(await platformAuthenticatorIsAvailable());
    });
  }, []);

  async function handleSetUp() {
    setError(null);
    setPending(true);
    try {
      const optionsResult = await generateWebauthnRegistrationOptionsAction();
      if (optionsResult.error || !optionsResult.options) {
        setError(optionsResult.error ?? dict.passkeySuggestion.error);
        return;
      }
      const optionsJSON: PublicKeyCredentialCreationOptionsJSON = JSON.parse(optionsResult.options);
      const response = await startRegistration({ optionsJSON });
      const verifyResult = await verifyWebauthnRegistrationAction(response, REGISTRATION_LABEL[deviceKind]);
      if (verifyResult.error) {
        setError(verifyResult.error);
        return;
      }
      router.replace(dashboardPath);
      router.refresh();
    } catch {
      setError(dict.passkeySuggestion.error);
    } finally {
      setPending(false);
    }
  }

  function handleSkip() {
    startSkipTransition(() => dismissPasskeyPromptAction());
  }

  const Icon = ICONS[deviceKind];
  const message =
    deviceKind === "ios" ? dict.passkeySuggestion.messageIos : deviceKind === "android" ? dict.passkeySuggestion.messageAndroid : dict.passkeySuggestion.messageDesktop;
  const badge =
    deviceKind === "ios" ? dict.passkeySuggestion.badgeIos : deviceKind === "android" ? dict.passkeySuggestion.badgeAndroid : dict.passkeySuggestion.badgeDesktop;

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{badge}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-navy-400">{message}</p>
        </div>
      </div>

      {supported !== null &&
        (supported === false ? (
          <p className="text-sm text-slate-500 dark:text-navy-400">{dict.biometrics.notSupported}</p>
        ) : (
          <Button type="button" className="w-full" onClick={handleSetUp} loading={pending}>
            {pending ? dict.passkeySuggestion.settingUp : dict.passkeySuggestion.setUpNow}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </Button>
        ))}

      <div className="flex justify-center">
        <button
          type="button"
          disabled={skipping}
          onClick={handleSkip}
          className="text-sm font-medium text-slate-500 hover:text-navy-700 disabled:opacity-50 dark:text-navy-400 dark:hover:text-white"
        >
          {skipping ? dict.passkeySuggestion.skipping : dict.passkeySuggestion.skip}
        </button>
      </div>
    </div>
  );
}
