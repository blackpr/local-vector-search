/**
 * Offline launch, part 2 of 2 (part 1 is the fetch handler in sw.ts).
 *
 * On the very first visit the service worker is not controlling the page yet,
 * so nothing that loaded passed through it. This copies everything the current
 * context has already fetched into the same cache the service worker reads
 * from. It runs in the page AND in the web worker, because each has its own
 * resource timeline (the worker is the one that fetched sqlite3.wasm and the
 * ONNX runtime).
 */
export const APP_CACHE = 'latent-app-v1';

/** Third-party origins the app needs at startup. Model files are excluded: Transformers.js caches those itself. */
export const RUNTIME_ORIGINS = ['https://cdn.jsdelivr.net'];

export function isAppShellUrl(url: URL, selfOrigin: string): boolean {
  if (url.origin === selfOrigin) return true;
  return RUNTIME_ORIGINS.includes(url.origin);
}

export async function warmAppCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const origin = self.location.origin;
    const urls = new Set<string>();
    if ('document' in self) urls.add(new URL('/', origin).href);
    for (const entry of performance.getEntriesByType('resource')) {
      const url = new URL(entry.name);
      if (url.protocol.startsWith('http') && isAppShellUrl(url, origin)) urls.add(url.href);
    }

    const cache = await caches.open(APP_CACHE);
    await Promise.all(
      [...urls].map(async (href) => {
        if (await cache.match(href)) return;
        try {
          const response = await fetch(href);
          if (response.ok) await cache.put(href, response);
        } catch {
          /* best effort */
        }
      }),
    );
  } catch (err) {
    console.warn('App cache warm-up skipped:', err);
  }
}
