/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;


const CACHE_NAME = 'vector-search-model-cache-v1';
const MODEL_CACHE_URLS = [
  // Patterns to match huggingface model requests
  'https://huggingface.co/',
  'https://cdn-lfs.huggingface.co/'
];

self.addEventListener('install', (_event: any) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);

  // Check if it's a model file request
  const isModelRequest = MODEL_CACHE_URLS.some(prefix => url.href.includes(prefix));

  if (isModelRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          // Use 'no-cors' if necessary, but models usually support cors.
          // We want to cache the response.
          const fetchResponse = await fetch(event.request);
          if (fetchResponse.ok) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      })
    );
  }
});
