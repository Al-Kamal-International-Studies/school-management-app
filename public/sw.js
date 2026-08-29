// Minimal service worker — exists mainly to satisfy Chrome's installability
// criteria (a registered SW with a fetch handler) so the app can be added to
// the home screen. Deliberately conservative: this app is auth-gated with
// per-user data, so we never cache HTML navigations or API calls — only
// static, immutable assets (icons, manifest, built JS/CSS chunks) — WITH
// ONE DELIBERATE EXCEPTION: /offline (see below), a genuinely static,
// no-auth, no-server-fetch route (app/offline/page.tsx) built specifically
// to be cacheable, which is the real answer to "does this app have actual
// offline behavior" (see HANDOVER.md's App Store plan / Apple Guideline
// 4.2). Caching /offline is not a change to the "never cache per-user data"
// rule above — it's a static shell that reads its own per-user summary out
// of localStorage client-side (see lib/offline/offlineCache.ts), never out
// of this cache.

const CACHE_NAME = "akis-static-v2";
const STATIC_CACHE_PATTERNS = [/^\/icons\//, /^\/_next\/static\//, /^\/manifest\.json$/];
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (a real page load/link click, not an asset/API
  // fetch) — try the network first, exactly as if there were no service
  // worker at all (every page here is per-user server-rendered, so the
  // network response must always win when it's available). Only on a
  // genuine network failure (offline, no connectivity) does this fall back
  // to the cached, static /offline shell — never on a normal HTTP error
  // response (a 404/500 still came from the real server and should be
  // shown as-is, not masked by the offline page).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL)))
    );
    return;
  }

  const isStaticAsset = STATIC_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));
  if (!isStaticAsset) return; // let the network handle everything else (API calls, auth)

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});

// Web Push (free, standards-based — see src/lib/push/send.ts). The payload
// is plain JSON: { title, body, url? }.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Al Kamal International Studies", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Al Kamal International Studies", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
