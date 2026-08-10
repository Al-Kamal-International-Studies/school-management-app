"use client";

import { useEffect, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { generateWebauthnLoginOptionsAction, verifyWebauthnLoginAction } from "@/app/login/webauthnActions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function BiometricSignInButton({
  emailRef,
  rememberRef,
  next,
}: {
  emailRef: RefObject<HTMLInputElement | null>;
  rememberRef: RefObject<HTMLInputElement | null>;
  next?: string;
}) {
  const { dict } = useLocale();
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
      setSupported(browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable()));
    });
  }, []);

  async function handleClick() {
    setError(null);
    const email = emailRef.current?.value?.trim();
    if (!email) {
      setError(dict.biometrics.enterEmailFirst);
      return;
    }

    setPending(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const optionsResult = await generateWebauthnLoginOptionsAction(email);
      if (optionsResult.error || !optionsResult.options) {
        setError(optionsResult.error ?? dict.biometrics.verificationFailed);
        return;
      }
      const response = await startAuthentication({ optionsJSON: JSON.parse(optionsResult.options) });
      const remember = rememberRef.current?.checked ?? true;
      const result = await verifyWebauthnLoginAction(response, remember, next);
      // A successful result never actually returns here — the action ends
      // in redirect(), which the Next.js client runtime intercepts and
      // navigates on automatically. Only a failure produces a normal
      // return value.
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError(dict.biometrics.verificationFailed);
    } finally {
      setPending(false);
    }
  }

  if (!supported) return null;

  return (
    <>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="button" variant="secondary" className="w-full" loading={pending} onClick={handleClick}>
        <Fingerprint className="h-4 w-4" />
        {pending ? dict.biometrics.signingIn : dict.biometrics.signInWith}
      </Button>
    </>
  );
}
