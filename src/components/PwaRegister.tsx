"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Only register in production. In dev, Next/Turbopack's chunk URLs can
    // be reused across edits while their content changes, and a cache-first
    // service worker will happily serve those stale bytes forever — which
    // is exactly the kind of "my CSS changes aren't showing up" bug this
    // guard avoids. Also proactively unregister + clear caches from any
    // dev-mode registration made before this guard existed.
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have, not critical — fail silently.
      });
    }
  }, []);

  return null;
}
