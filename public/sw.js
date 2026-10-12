/**
 * StreamVerse Offline Service Worker (/sw.js)
 * Intercetta le richieste di metadati offline (/offline-metadata/<id>.json)
 * e le immagini di locandina salvate nella Cache API ('streamverse-offline-v1')
 * per consentire la consultazione e visione offline dei titoli scaricati.
 */

const OFFLINE_CACHE_NAME = 'streamverse-offline-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Ascolta messaggi dal client per salvare o rimuovere metadati e locandine nella Cache API
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CACHE_OFFLINE_ITEM' && data.item && data.item.id) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const metadataUrl = `/offline-metadata/${encodeURIComponent(data.item.id)}.json`;
        const payload = JSON.stringify({
          ...data.item,
          cachedAt: new Date().toISOString(),
          offlineReady: true,
        });
        await cache.put(
          metadataUrl,
          new Response(payload, {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-StreamVerse-Offline': 'true',
            },
          }),
        );

        if (typeof data.item.immagine === 'string' && data.item.immagine.startsWith('/')) {
          try {
            const imgResp = await fetch(data.item.immagine, { credentials: 'same-origin' });
            if (imgResp.ok) {
              await cache.put(data.item.immagine, imgResp.clone());
            }
          } catch {
            // ignore image prefetch failure
          }
        }
      })(),
    );
  } else if (data.type === 'REMOVE_OFFLINE_ITEM' && data.itemId) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const metadataUrl = `/offline-metadata/${encodeURIComponent(data.itemId)}.json`;
        await cache.delete(metadataUrl);
      })(),
    );
  }
});

// Strategia Cache-First per i metadati offline e le risorse salvate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (
    url.pathname.startsWith('/offline-metadata/') ||
    url.pathname.startsWith('/src/assets/images/')
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        return fetch(req);
      })(),
    );
  }
});
