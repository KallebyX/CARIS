// CÁRIS Service Worker
// Version: 1.0.0

const CACHE_VERSION = 'caris-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Resources to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json'
];

// API endpoints that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/patient/profile',
  '/api/psychologist/profile',
  '/api/patient/mood-tracking',
  '/api/patient/diary/entries'
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 60;
const MAX_API_CACHE_SIZE = 30;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('caris-') && !name.startsWith(CACHE_VERSION))
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and external requests
  if (!url.origin.includes(self.location.origin) && !url.origin.includes('fonts.googleapis.com') && !url.origin.includes('fonts.gstatic.com')) {
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache first, network fallback
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
    return;
  }

  // Fonts - Cache first
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Static assets (JS, CSS) - Cache first, network fallback
  if (url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE));
    return;
  }

  // Default - Network first
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE));
});

// Cache first strategy
async function cacheFirstStrategy(request, cacheName, maxSize = null) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cached;
    }

    console.log('[Service Worker] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response && response.status === 200) {
      const clonedResponse = response.clone();
      cache.put(request, clonedResponse);

      if (maxSize) {
        limitCacheSize(cacheName, maxSize);
      }
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Cache first strategy failed:', error);

    // Try to return offline fallback for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/offline') || new Response('Offline', { status: 503 });
    }

    return new Response('Network error', { status: 503 });
  }
}

// Network first strategy
async function networkFirstStrategy(request, cacheName, maxSize = null) {
  try {
    console.log('[Service Worker] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      const clonedResponse = response.clone();
      cache.put(request, clonedResponse);

      if (maxSize) {
        limitCacheSize(cacheName, maxSize);
      }
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);

    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cached;
    }

    // Return offline fallback for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      const staticCache = await caches.open(STATIC_CACHE);
      return staticCache.match('/offline') || new Response('Offline', { status: 503 });
    }

    return new Response('Offline', { status: 503 });
  }
}

// Limit cache size
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    console.log(`[Service Worker] Limiting cache ${cacheName} to ${maxSize} items`);
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxSize);
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-diary-entries') {
    event.waitUntil(syncDiaryEntries());
  }

  if (event.tag === 'sync-chat-messages') {
    event.waitUntil(syncChatMessages());
  }

  if (event.tag === 'sync-mood-tracking') {
    event.waitUntil(syncMoodTracking());
  }
});

// Sync diary entries from IndexedDB
async function syncDiaryEntries() {
  try {
    const db = await openDatabase();
    const tx = db.transaction('pendingDiaryEntries', 'readonly');
    const store = tx.objectStore('pendingDiaryEntries');
    const entries = await store.getAll();

    for (const entry of entries) {
      try {
        const response = await fetch('/api/patient/diary/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.data)
        });

        if (response.ok) {
          const deleteTx = db.transaction('pendingDiaryEntries', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingDiaryEntries');
          await deleteStore.delete(entry.id);

          console.log('[Service Worker] Synced diary entry:', entry.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync diary entry:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync diary entries failed:', error);
  }
}

// Sync chat messages from IndexedDB
async function syncChatMessages() {
  try {
    const db = await openDatabase();
    const tx = db.transaction('pendingChatMessages', 'readonly');
    const store = tx.objectStore('pendingChatMessages');
    const messages = await store.getAll();

    for (const message of messages) {
      try {
        const response = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.data)
        });

        if (response.ok) {
          const deleteTx = db.transaction('pendingChatMessages', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingChatMessages');
          await deleteStore.delete(message.id);

          console.log('[Service Worker] Synced chat message:', message.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync chat message:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync chat messages failed:', error);
  }
}

// Sync mood tracking from IndexedDB
async function syncMoodTracking() {
  try {
    const db = await openDatabase();
    const tx = db.transaction('pendingMoodTracking', 'readonly');
    const store = tx.objectStore('pendingMoodTracking');
    const entries = await store.getAll();

    for (const entry of entries) {
      try {
        const response = await fetch('/api/patient/mood-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.data)
        });

        if (response.ok) {
          const deleteTx = db.transaction('pendingMoodTracking', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingMoodTracking');
          await deleteStore.delete(entry.id);

          console.log('[Service Worker] Synced mood tracking:', entry.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync mood tracking:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync mood tracking failed:', error);
  }
}

// Open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CarisOfflineDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingDiaryEntries')) {
        db.createObjectStore('pendingDiaryEntries', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('pendingChatMessages')) {
        db.createObjectStore('pendingChatMessages', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('pendingMoodTracking')) {
        db.createObjectStore('pendingMoodTracking', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let data = { title: 'CÁRIS', body: 'Nova notificação' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handling from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(urls))
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
        })
    );
  }
});

console.log('[Service Worker] Loaded successfully');
