// Minimal service worker — exists mainly to satisfy Chrome's installability
// criteria (a registered SW with a fetch handler) so the app can be added to
// the home screen. Deliberately conservative: this app is auth-gated with
// per-user data, so we never cache HTML navigations or API calls — only
// static, immutable assets (icons, manifest, built JS/CSS chunks).

const CACHE_NAME = "akis-static-v1";
const STATIC_CACHE_PATTERNS = [/^\/icons\//, /^\/_next\/static\//, /^\/manifest\.json$/];

self.addEventListener("install", (event) => {
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

  const isStaticAsset = STATIC_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));
  if (!isStaticAsset) return; // let the network handle everything else (HTML, API, auth)

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
