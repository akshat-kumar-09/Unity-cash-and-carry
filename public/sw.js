/* Unity Trade — network-first; no stale shell cache. The only thing cached is the
   offline fallback page, so a dropped connection mid-session shows something useful
   instead of every navigation just failing silently. */
const OFFLINE_CACHE = "unity-offline-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL))
      )
    )
    return
  }
  event.respondWith(fetch(event.request))
})
