"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Native-shell-only setup — a no-op in the browser (Capacitor.isNativePlatform()
 * is false there), so this never affects the plain web app, same "only
 * matters in one specific runtime" shape as PwaRegister.tsx's own
 * production-only guard right above it in layout.tsx.
 *
 * Two things, both real requirements for a native app to feel native rather
 * than like a bookmark (see capacitor.config.ts's own doc comment on why
 * that distinction matters for Apple's Guideline 4.2 review):
 *  - StatusBar: matches this app's navy chrome (manifest.json's
 *    background_color/theme_color, #0b2138) with light (white) icons/text,
 *    instead of the OS default black-on-transparent that would be
 *    unreadable against a dark bar.
 *  - SplashScreen: Capacitor shows this automatically on native cold start
 *    (configured to stay up until explicitly hidden — see
 *    capacitor.config.ts's plugins.SplashScreen block) so the real app has
 *    a moment to actually load over the network (server.url mode, not a
 *    bundled build — see that file's own doc comment) before anything is
 *    shown; hidden here once this component actually mounts, i.e. once
 *    real page content is on screen, not on a fixed timer.
 *
 * Dynamically imported (not a static top-level import) so these two
 * `@capacitor/*` packages are never pulled into the plain web app's bundle
 * at all — they're native-shell dependencies, irrelevant weight for every
 * browser visitor.
 */
export function NativeAppBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      await StatusBar.setStyle({ style: Style.Dark }); // "Dark" = light content, for a dark status bar background
      await StatusBar.setBackgroundColor({ color: "#0b2138" }).catch(() => {
        // iOS doesn't support setBackgroundColor (it uses the WebView's own
        // background instead) — Android does. Not an error either way.
      });
      await SplashScreen.hide();
    })().catch(() => {
      // Splash/status-bar setup is cosmetic — never block the app over it.
    });

    // Tapping a native push notification (delivered via sendNative.ts's
    // FCM/APNs send, once configured — see that file's own doc comment)
    // navigates to its `url`, same as sw.js's own `notificationclick`
    // handler already does for Web Push. Registration/permission itself is
    // NOT requested here — that stays an explicit opt-in via
    // PushNotificationToggle.tsx (Settings), same UX on native as on web,
    // not an automatic prompt on every app open.
    let removeListener: (() => void) | undefined;
    import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = (action.notification.data as { url?: string } | undefined)?.url;
        if (url) window.location.href = url;
      }).then((handle) => {
        removeListener = () => handle.remove();
      });
    });

    return () => removeListener?.();
  }, []);

  return null;
}
