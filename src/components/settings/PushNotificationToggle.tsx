"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
  registerNativePushTokenAction,
  unregisterAllNativePushTokensAction,
} from "@/app/(dashboard)/settings/actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Web Push application server keys are base64url-encoded; the browser API
// needs them as a raw Uint8Array.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** One control, one settings surface, two different mechanisms underneath —
 * same shape as NativeAppBootstrap.tsx's own "branch on Capacitor.
 * isNativePlatform(), never a second UI" philosophy. Standards-based Web
 * Push (browser) is untouched; inside the native Capacitor shell this now
 * ALSO offers native push (APNs/FCM via @capacitor/push-notifications) —
 * see 0041_native_push_tokens.sql's header comment for why native needs an
 * entirely different registration mechanism, not just a different payload
 * shape, than the browser's Push API. */
export function PushNotificationToggle() {
  // Starts as `null` (not `false`) on purpose: the server can never know
  // whether the browser supports push, so the first client render must
  // match the server's render exactly (render nothing) to avoid a
  // hydration mismatch — the real value is only knowable after mount,
  // which is exactly what effects are for.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { dict } = useLocale();

  useEffect(() => {
    // Deferred via a microtask (not called synchronously in the effect
    // body) per React's stricter effect-timing lint rule — see
    // HANDOVER.md's documented gotcha on this exact class of issue.
    queueMicrotask(async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        setIsNative(true);
        setSupported(true);
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const status = await PushNotifications.checkPermissions();
        setSubscribed(status.receive === "granted");
        return;
      }

      const ok = "serviceWorker" in navigator && "PushManager" in window;
      setSupported(ok);
      if (!ok) return;
      navigator.serviceWorker.ready.then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      });
    });
  }, []);

  function enableNative() {
    setError(null);
    startTransition(async () => {
      try {
        const [{ Capacitor }, { PushNotifications }] = await Promise.all([import("@capacitor/core"), import("@capacitor/push-notifications")]);
        const platform = Capacitor.getPlatform();
        if (platform !== "ios" && platform !== "android") return; // never reached — enableNative only runs when isNative

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          setError(dict.settings.pushPermissionDenied);
          return;
        }

        // register() is fire-and-forget — the actual token arrives async
        // via the "registration" listener, set up once (see the effect
        // below this function) so it keeps working across re-renders, not
        // just the click that triggered this specific registration.
        await PushNotifications.register();
        setSubscribed(true);
      } catch {
        setError(dict.settings.pushEnableFailed);
      }
    });
  }

  function disableNative() {
    setError(null);
    startTransition(async () => {
      const [{ Capacitor }, { PushNotifications }] = await Promise.all([import("@capacitor/core"), import("@capacitor/push-notifications")]);
      const platform = Capacitor.getPlatform();
      if (platform === "ios" || platform === "android") {
        // The OS doesn't expose a way to revoke just this app's
        // notification permission programmatically — the durable,
        // actually-effective part of "turn this off" is removing every
        // stored token for this user+platform server-side (see that
        // action's own doc comment), so no more sends are attempted
        // regardless of what the OS permission still says.
        await unregisterAllNativePushTokensAction(platform);
      }
      setSubscribed(false);
    });
  }

  useEffect(() => {
    if (!isNative) return;
    let removeListener: (() => void) | undefined;

    (async () => {
      const [{ Capacitor }, { PushNotifications }] = await Promise.all([import("@capacitor/core"), import("@capacitor/push-notifications")]);
      const platform = Capacitor.getPlatform();
      if (platform !== "ios" && platform !== "android") return;

      const handle = await PushNotifications.addListener("registration", (token) => {
        registerNativePushTokenAction({ platform, token: token.value }).catch(() => {
          // Best-effort — the toggle already reflects "granted" from the OS
          // permission state regardless of whether this specific save
          // succeeded; a transient failure here self-heals next time
          // register() fires (e.g. next app open), same as most native
          // push integrations' own retry behavior.
        });
      });
      removeListener = () => handle.remove();
    })();

    return () => removeListener?.();
  }, [isNative]);

  function enable() {
    if (isNative) return enableNative();
    setError(null);
    startTransition(async () => {
      try {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          setError(dict.settings.pushNotConfigured);
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError(dict.settings.pushPermissionDenied);
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const result = await subscribeToPushAction({ endpoint: json.endpoint, keys: json.keys });
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSubscribed(true);
      } catch {
        setError(dict.settings.pushEnableFailed);
      }
    });
  }

  function disable() {
    if (isNative) return disableNative();
    setError(null);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    });
  }

  if (supported === null) return null;

  if (!supported) {
    return <p className="text-sm text-slate-500 dark:text-navy-400">{dict.settings.pushNotSupported}</p>;
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="button" variant={subscribed ? "secondary" : "primary"} loading={pending} onClick={subscribed ? disable : enable}>
        {subscribed ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
        {subscribed ? dict.settings.pushTurnOff : dict.settings.pushEnable}
      </Button>
    </div>
  );
}
