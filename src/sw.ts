/// <reference lib="webworker" />
import { APP_CACHE, isAppShellUrl } from './offline/warmAppCache';

declare const self: ServiceWorkerGlobalScope;

// Earlier versions kept a second copy of every model file here. Transformers.js
// already stores them in its own Cache Storage bucket ("transformers-cache"),
// so that only doubled the disk usage. Dropped on activate.
const LEGACY_MODEL_CACHE = 'vector-search-model-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await caches.delete(LEGACY_MODEL_CACHE);
      await self.clients.claim();
    })(),
  );
});

// The app shell (HTML, JS, CSS, sqlite3.wasm, ONNX runtime from the CDN):
// network first so a deploy is picked up immediately, cache when offline.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (!isAppShellUrl(url, self.location.origin)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached =
          (await cache.match(request, { ignoreVary: true })) ||
          (request.mode === 'navigate' ? await cache.match(new URL('/', self.location.origin).href) : undefined);
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});
