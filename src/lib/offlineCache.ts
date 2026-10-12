import type { StreamVerseItem } from '@/lib/streamVerseCatalog';

export const OFFLINE_CACHE_NAME = 'streamverse-offline-v1';
export const OFFLINE_STORAGE_FALLBACK_KEY = 'streamverse_offline_downloads_v1';

export interface OfflineDownloadedRecord {
  item: StreamVerseItem;
  cachedAt: string;
  sizeKb: number;
}

/**
 * Registra il Service Worker (/sw.js) per il supporto offline.
 */
export async function registerStreamVerseServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch {
    return null;
  }
}

/**
 * Costruisce l'URL canonico nella Cache API per i metadati di un titolo.
 */
function getMetadataCacheUrl(itemId: string): string {
  return `/offline-metadata/${encodeURIComponent(itemId)}.json`;
}

/**
 * Legge tutti i contenuti scaricati per la visione offline dalla Cache API
 * (con sincronizzazione di backup su localStorage).
 */
export async function getOfflineDownloadedItems(): Promise<Record<string, OfflineDownloadedRecord>> {
  const records: Record<string, OfflineDownloadedRecord> = {};

  if (typeof window === 'undefined') return records;

  // 1. Prova a leggere dalla Cache API del browser
  if ('caches' in window) {
    try {
      const cache = await window.caches.open(OFFLINE_CACHE_NAME);
      const keys = await cache.keys();
      for (const request of keys) {
        const url = new URL(request.url, window.location.origin);
        if (url.pathname.startsWith('/offline-metadata/') && url.pathname.endsWith('.json')) {
          const response = await cache.match(request);
          if (response) {
            const parsed = (await response.json()) as OfflineDownloadedRecord;
            if (parsed?.item?.id) {
              records[parsed.item.id] = parsed;
            }
          }
        }
      }
    } catch {
      // fallback a localStorage sotto
    }
  }

  // 2. Unisci eventuali record salvati in localStorage
  try {
    const raw = window.localStorage.getItem(OFFLINE_STORAGE_FALLBACK_KEY);
    if (raw) {
      const fallbackMap = JSON.parse(raw) as Record<string, OfflineDownloadedRecord>;
      for (const [id, rec] of Object.entries(fallbackMap)) {
        if (!records[id] && rec?.item?.id) {
          records[id] = rec;
        }
      }
    }
  } catch {
    // ignore
  }

  return records;
}

/**
 * Salva i metadati completi del film/serie e la locandina nella Cache API (e notifica il Service Worker)
 * per la consultazione e visione offline.
 */
export async function saveItemToOfflineCache(
  item: StreamVerseItem,
): Promise<OfflineDownloadedRecord> {
  const cachedAt = new Date().toISOString();
  const payloadObj: OfflineDownloadedRecord = {
    item,
    cachedAt,
    sizeKb: Math.max(12, Math.round(JSON.stringify(item).length / 32) + 48),
  };
  const jsonString = JSON.stringify(payloadObj);

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(OFFLINE_CACHE_NAME);
      const metadataUrl = getMetadataCacheUrl(item.id);
      const response = new Response(jsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-StreamVerse-Offline': 'true',
        },
      });
      await cache.put(metadataUrl, response);

      // Metti in cache anche la locandina/backdrop se è un asset locale
      const imagesToCache = [item.immagine, item.backdropImage].filter(
        (u): u is string => Boolean(u && u.startsWith('/')),
      );
      for (const imgUrl of imagesToCache) {
        try {
          const imgRes = await fetch(imgUrl, { credentials: 'same-origin' });
          if (imgRes.ok) {
            await cache.put(imgUrl, imgRes.clone());
          }
        } catch {
          // ignore image fetch failure when offline
        }
      }
    } catch {
      // ignore Cache API quota error
    }
  }

  // Invia messaggio anche al Service Worker attivo, se presente
  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller
  ) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_OFFLINE_ITEM',
      item,
    });
  }

  // Aggiorna l'indice di backup in localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(OFFLINE_STORAGE_FALLBACK_KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, OfflineDownloadedRecord>) : {};
      current[item.id] = payloadObj;
      window.localStorage.setItem(OFFLINE_STORAGE_FALLBACK_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }

  return payloadObj;
}

/**
 * Rimuove i metadati di un contenuto dalla Cache API e dal backup locale.
 */
export async function removeItemFromOfflineCache(itemId: string): Promise<void> {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(OFFLINE_CACHE_NAME);
      await cache.delete(getMetadataCacheUrl(itemId));
    } catch {
      // ignore
    }
  }

  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller
  ) {
    navigator.serviceWorker.controller.postMessage({
      type: 'REMOVE_OFFLINE_ITEM',
      itemId,
    });
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(OFFLINE_STORAGE_FALLBACK_KEY);
      if (raw) {
        const current = JSON.parse(raw) as Record<string, OfflineDownloadedRecord>;
        delete current[itemId];
        window.localStorage.setItem(OFFLINE_STORAGE_FALLBACK_KEY, JSON.stringify(current));
      }
    } catch {
      // ignore
    }
  }
}
