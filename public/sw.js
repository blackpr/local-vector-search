const r = "vector-search-model-cache-v1", i = [
  // Patterns to match huggingface model requests
  "https://huggingface.co/",
  "https://cdn-lfs.huggingface.co/"
];
self.addEventListener("install", (e) => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const n = new URL(e.request.url);
  i.some((s) => n.href.includes(s)) && e.respondWith(
    caches.open(r).then(async (s) => {
      const c = await s.match(e.request);
      if (c)
        return c;
      try {
        const t = await fetch(e.request);
        return t.ok && s.put(e.request, t.clone()), t;
      } catch (t) {
        throw console.error("Fetch failed:", t), t;
      }
    })
  );
});
