import type { CapacitorConfig } from "@capacitor/cli";

/**
 * This app is a real, dynamic, server-rendered Next.js app (cookies, Server
 * Actions, Supabase auth/RLS on every request) — NOT a static export. That
 * rules out Capacitor's usual "bundle webDir into the app" mode, which only
 * works for static assets. Instead this uses Capacitor's documented
 * "live/remote server" mode: `server.url` points at the real production
 * deployment, and the native shell's WebView just loads that URL directly,
 * the same way a browser would — every server action, cookie, and RLS
 * policy behaves identically to the web app, because it IS the web app,
 * just inside a native wrapper instead of a browser tab.
 *
 * `webDir` is still a required field even in this mode — Capacitor copies
 * whatever's there into the native project as a local fallback (used only
 * if `server.url` is briefly unreachable, e.g. no network on cold start
 * before the real offline strategy — see the service worker / native
 * offline-cache work — can serve cached data instead). Points at
 * public/capacitor-shell, a minimal branded loading page, not the actual
 * app (which can't be statically bundled at all, per above).
 *
 * See HANDOVER.md for the full app-store readiness plan this file is part
 * of, and why: Google Play accepts a Trusted Web Activity for a PWA as-is,
 * but Apple's Guideline 4.2 (Minimum Functionality) rejects a bare
 * WebView-over-a-website with nothing native added — Capacitor is the one
 * wrapper that satisfies both stores from a single codebase, which is why
 * it was chosen over TWA-only tooling.
 */
const config: CapacitorConfig = {
  appId: "com.alkamalinternational.app",
  appName: "Al Kamal",
  webDir: "public/capacitor-shell",

  server: {
    // The real, live production deployment — see this file's own doc
    // comment for why a remote URL (not a bundled static build) is
    // correct here. Update this if/when a custom domain replaces the
    // .vercel.app one (HANDOVER.md's own still-open "custom domain vs.
    // staying on .vercel.app" decision, Part 13 §6).
    url: "https://school-management-app-nine-beryl.vercel.app",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },

  ios: {
    contentInset: "automatic",
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      // Kept up until NativeAppBootstrap.tsx explicitly calls hide() once
      // real app content has actually mounted — not a fixed duration,
      // which would either flash away before a slow network load finishes
      // or linger pointlessly after a fast one.
      launchAutoHide: false,
      backgroundColor: "#0b2138",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b2138",
    },
  },
};

export default config;
