import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

const OFFLINE_URL = '/offline.html';

const CACHES = {
  images: 'images',
  static: 'static-assets',
  api: 'api-cache',
  uploads: 'uploads',
};

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHES.images,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'font' || request.destination === 'style' || request.destination === 'script',
  new CacheFirst({
    cacheName: CACHES.static,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/defeitos') || url.pathname.startsWith('/api/v1/categorias') || url.pathname.startsWith('/api/v1/municipios'),
  new NetworkFirst({
    cacheName: CACHES.api,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new CacheFirst({
    cacheName: CACHES.uploads,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL) || new Response('Sem conexão', { status: 503 });
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-defeitos') {
    event.waitUntil(processarFilaOffline());
  }
});

async function processarFilaOffline() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('defeitos', 'readonly');
    const store = tx.objectStore('defeitos');
    const todos = await store.getAll();
    await tx.done;

    for (const item of todos) {
      try {
        const token = item.token;
        const formData = new FormData();
        Object.entries(item.dados).forEach(([k, v]) => formData.append(k, v));

        const res = await fetch('/api/v1/defeitos/', {
          method: 'POST',
          headers: {
            Authorization: token,
          },
          body: formData,
        });

        if (res.ok) {
          const db2 = await openOfflineDB();
          const tx2 = db2.transaction('defeitos', 'readwrite');
          tx2.objectStore('defeitos').delete(item.id);
          await tx2.done;

          self.registration.showNotification('Chamado enviado!', {
            body: 'Seu chamado foi criado com sucesso.',
            icon: '/icon.svg',
          });
        }
      } catch {
        // tentar de novo no próximo sync
      }
    }
  } catch {
    // IndexedDB não disponível
  }
}

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ciu-offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('defeitos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch {
    // ignorar notificações mal formatadas
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
