const c = "latent-app-v1", s = ["https://cdn.jsdelivr.net"];
function o(e, t) {
  return e.origin === t ? !0 : s.includes(e.origin);
}
const l = "vector-search-model-cache-v1";
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      await caches.delete(l), await self.clients.claim();
    })()
  );
});
self.addEventListener("fetch", (e) => {
  const t = e.request;
  if (t.method !== "GET") return;
  const r = new URL(t.url);
  r.protocol.startsWith("http") && o(r, self.location.origin) && e.respondWith(
    (async () => {
      const i = await caches.open(c);
      try {
        const n = await fetch(t);
        return n.ok && i.put(t, n.clone()), n;
      } catch (n) {
        const a = await i.match(t, { ignoreVary: !0 }) || (t.mode === "navigate" ? await i.match(new URL("/", self.location.origin).href) : void 0);
        if (a) return a;
        throw n;
      }
    })()
  );
});
