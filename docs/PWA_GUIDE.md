# Progressive Web App (PWA) Guide - CÁRIS Platform

Complete guide for the Progressive Web App implementation in the CÁRIS mental health platform.

## Executive Summary

The CÁRIS platform is a **fully-functional Progressive Web App** with comprehensive offline support, including:

✅ **Service Worker** with multiple caching strategies
✅ **Background Sync** for offline data synchronization
✅ **IndexedDB** for local data storage
✅ **Push Notifications** for real-time alerts
✅ **Install Prompts** for home screen installation
✅ **Offline Fallback** pages and components
✅ **Update Management** with user notifications

---

## Table of Contents

- [What is a PWA?](#what-is-a-pwa)
- [Features](#features)
- [Architecture](#architecture)
- [Offline Functionality](#offline-functionality)
- [Service Worker](#service-worker)
- [Caching Strategies](#caching-strategies)
- [Background Sync](#background-sync)
- [Push Notifications](#push-notifications)
- [Installation](#installation)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## What is a PWA?

A Progressive Web App combines the best of web and mobile apps:

- **Installable**: Users can add to home screen
- **Offline-capable**: Works without internet connection
- **App-like**: Feels like a native mobile app
- **Auto-updating**: Updates automatically in background
- **Push notifications**: Receive notifications even when closed
- **Responsive**: Works on any device size

### Why PWA for Mental Health?

Mental health support needs to be **always available**:

1. **Crisis Access**: Users can access tools during connectivity issues
2. **Privacy**: Offline mode reduces data transmission
3. **Accessibility**: Works in areas with poor connectivity
4. **Convenience**: Feels like a native app without app store
5. **Journal Continuity**: Write diary entries anywhere, sync later

---

## Features

### 1. Offline Support

✅ **View Cached Content**
- Dashboard
- Previous diary entries
- Mood tracking history
- Scheduled sessions

✅ **Create Content Offline**
- Write diary entries (syncs when online)
- Record mood tracking (syncs when online)
- Send chat messages (queued for sending)

✅ **Background Sync**
- Automatic synchronization when connection restored
- Retry failed requests
- Queue management

### 2. Installation

✅ **Install Prompts**
- Automatic prompt after 5 seconds
- Custom install UI
- Install confirmation toasts

✅ **Home Screen Icon**
- Multiple icon sizes (72px to 512px)
- Maskable icons for Android
- Splash screens

✅ **Shortcuts**
- Dashboard (direct access)
- Chat (quick messaging)
- Diary (fast journaling)

### 3. Performance

✅ **Caching**
- Static assets (JS, CSS, fonts)
- Images (up to 60 items)
- API responses (up to 30 items)
- Dynamic pages (up to 50 items)

✅ **Cache Strategies**
- Cache-first for static assets
- Network-first for dynamic content
- Stale-while-revalidate for images

### 4. Notifications

✅ **Push Notifications**
- Session reminders
- New messages
- SOS alerts
- Medication reminders

✅ **Notification Actions**
- Quick reply to messages
- Snooze reminders
- View details

---

## Architecture

### File Structure

```
├── public/
│   ├── sw.js                      # Service Worker (400+ lines)
│   ├── manifest.json              # PWA Manifest
│   └── icons/                     # App icons (8 sizes)
├── app/
│   ├── sw-register.tsx            # SW registration (240+ lines)
│   └── offline/
│       └── page.tsx               # Offline fallback page
├── lib/
│   ├── offline-storage.ts         # IndexedDB wrapper
│   └── offline-detection.ts       # Network detection
├── components/
│   ├── offline-fallback.tsx       # Offline UI components
│   └── offline-indicator.tsx      # Connection status indicator
└── hooks/
    └── use-online-status.ts       # Online/offline hook
```

### Components

**Service Worker** (`public/sw.js`):
- Handles all network requests
- Implements caching strategies
- Background sync for offline data
- Push notification handling

**SW Registration** (`app/sw-register.tsx`):
- Registers service worker
- Handles updates
- Manages install prompts
- Provides utility functions

**Offline Storage** (`lib/offline-storage.ts`):
- IndexedDB wrapper
- CRUD operations
- Sync status tracking
- Data querying

---

## Offline Functionality

### How It Works

1. **User Goes Offline**
   ```
   User loses connection
   ↓
   Service worker intercepts requests
   ↓
   Serves cached content
   ↓
   Queues write operations in IndexedDB
   ```

2. **User Creates Content**
   ```
   User writes diary entry offline
   ↓
   Saved to IndexedDB with sync status "pending"
   ↓
   Background sync registered
   ↓
   Waits for connection
   ```

3. **Connection Restored**
   ```
   Connection restored
   ↓
   Background sync triggered
   ↓
   Pending data uploaded to server
   ↓
   IndexedDB cleared
   ↓
   UI updated with server response
   ```

### Supported Offline Features

| Feature | Offline View | Offline Create | Auto-Sync |
|---------|--------------|----------------|-----------|
| Dashboard | ✅ | ❌ | N/A |
| Diary Entries | ✅ | ✅ | ✅ |
| Mood Tracking | ✅ | ✅ | ✅ |
| Chat Messages | ✅ | ✅ | ✅ |
| Sessions | ✅ | ❌ | N/A |
| Profile | ✅ | ❌ | N/A |

---

## Service Worker

### Lifecycle

```javascript
// 1. INSTALL
self.addEventListener('install', (event) => {
  // Cache static assets
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  )
})

// 2. ACTIVATE
self.addEventListener('activate', (event) => {
  // Cleanup old caches
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
      ))
  )
})

// 3. FETCH
self.addEventListener('fetch', (event) => {
  // Intercept and cache requests
  event.respondWith(
    cacheFirstStrategy(event.request)
  )
})
```

### Cache Names

- **`caris-v1-static`**: Static assets (JS, CSS, fonts, HTML)
- **`caris-v1-dynamic`**: Dynamic pages and content
- **`caris-v1-images`**: Image files
- **`caris-v1-api`**: API responses

### Cache Limits

```javascript
const MAX_DYNAMIC_CACHE_SIZE = 50  // pages
const MAX_IMAGE_CACHE_SIZE = 60    // images
const MAX_API_CACHE_SIZE = 30      // API responses
```

---

## Caching Strategies

### 1. Cache First (Static Assets)

**Best for**: Images, fonts, static JS/CSS

```javascript
async function cacheFirstStrategy(request) {
  // 1. Check cache
  const cached = await caches.match(request)
  if (cached) return cached

  // 2. Fetch from network
  const response = await fetch(request)

  // 3. Cache response
  const cache = await caches.open(CACHE_NAME)
  cache.put(request, response.clone())

  return response
}
```

**Flow**:
```
Request → Cache → Found? → Return cached
                ↓ Not found
         Network → Cache → Return response
```

### 2. Network First (Dynamic Content)

**Best for**: API calls, dynamic pages, user data

```javascript
async function networkFirstStrategy(request) {
  try {
    // 1. Try network
    const response = await fetch(request)

    // 2. Cache response
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())

    return response
  } catch (error) {
    // 3. Fallback to cache
    return caches.match(request)
  }
}
```

**Flow**:
```
Request → Network → Success? → Cache → Return
                ↓ Fail
         Cache → Found? → Return cached
                       ↓ Not found
                Offline page
```

### 3. Stale While Revalidate

**Best for**: Non-critical content that can be slightly outdated

```javascript
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)

  // Return cached immediately
  const fetchPromise = fetch(request).then(response => {
    // Update cache in background
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
    return response
  })

  return cached || fetchPromise
}
```

---

## Background Sync

### Supported Operations

**Diary Entries**:
```javascript
// Offline: Save to IndexedDB
await addItem(STORES.PENDING_DIARY_ENTRIES, {
  data: diaryEntry,
  timestamp: Date.now()
})

// Background Sync: Upload to server
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-diary-entries') {
    event.waitUntil(syncDiaryEntries())
  }
})
```

**Chat Messages**:
```javascript
// Queue message
await addItem(STORES.PENDING_CHAT_MESSAGES, {
  data: message,
  conversationId: chatId,
  timestamp: Date.now()
})

// Sync when online
navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-chat-messages')
})
```

**Mood Tracking**:
```javascript
// Save mood entry
await addItem(STORES.PENDING_MOOD_TRACKING, {
  data: moodEntry,
  date: today,
  timestamp: Date.now()
})

// Auto-sync
navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-mood-tracking')
})
```

### Sync Process

1. **Queue Data** (when offline):
   ```
   User action → Save to IndexedDB → Register sync
   ```

2. **Wait for Connection**:
   ```
   Browser detects online → Triggers sync event
   ```

3. **Upload to Server**:
   ```
   Service worker → Fetch pending items → POST to API
   ```

4. **Cleanup**:
   ```
   Success response → Delete from IndexedDB → Done
   ```

5. **Retry on Failure**:
   ```
   Failed request → Keep in IndexedDB → Retry later
   ```

---

## Push Notifications

### Setup

**1. Request Permission**:
```typescript
const permission = await Notification.requestPermission()
if (permission === 'granted') {
  // Subscribe to push
}
```

**2. Subscribe to Push**:
```typescript
const registration = await navigator.serviceWorker.ready
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
})

// Send subscription to server
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
})
```

**3. Handle Notifications**:
```javascript
// In service worker
self.addEventListener('push', (event) => {
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      actions: data.actions,
      data: data.data
    })
  )
})
```

### Notification Types

**Session Reminders**:
```json
{
  "title": "Sessão em 1 hora",
  "body": "Sua sessão com Dr. João começa às 14:00",
  "actions": [
    {"action": "view", "title": "Ver detalhes"},
    {"action": "snooze", "title": "Lembrar depois"}
  ]
}
```

**New Messages**:
```json
{
  "title": "Nova mensagem",
  "body": "Dr. João: Como você está se sentindo hoje?",
  "actions": [
    {"action": "reply", "title": "Responder"},
    {"action": "view", "title": "Ver chat"}
  ]
}
```

**SOS Alerts**:
```json
{
  "title": "⚠️ Alerta SOS",
  "body": "Seu paciente João solicitou ajuda imediata",
  "requireInteraction": true,
  "actions": [
    {"action": "call", "title": "Ligar"},
    {"action": "message", "title": "Enviar mensagem"}
  ]
}
```

---

## Installation

### Manifest Configuration

**`public/manifest.json`**:
```json
{
  "name": "CÁRIS - Clareza Existencial",
  "short_name": "CÁRIS",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#8B5CF6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "icons": [{"src": "/icons/icon-192x192.png", "sizes": "192x192"}]
    }
  ]
}
```

### Install Prompt

**Automatic** (after 5 seconds):
```typescript
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()

  // Show custom install UI after delay
  setTimeout(() => {
    showInstallPrompt()
  }, 5000)
})
```

**Manual**:
```typescript
import { triggerInstallPrompt } from '@/app/sw-register'

<Button onClick={triggerInstallPrompt}>
  Instalar App
</Button>
```

### Install Check

```typescript
import { isStandalone } from '@/app/sw-register'

if (isStandalone()) {
  console.log('Running as installed PWA')
}
```

---

## Testing

### Manual Testing

**1. Service Worker Registration**:
```
1. Open DevTools → Application → Service Workers
2. Verify service worker is registered
3. Check status: "activated and running"
```

**2. Offline Mode**:
```
1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Navigate app - should show cached content
4. Create diary entry - should save to IndexedDB
5. Go online - should sync automatically
```

**3. Cache Inspection**:
```
1. DevTools → Application → Cache Storage
2. Verify caches exist:
   - caris-v1-static
   - caris-v1-dynamic
   - caris-v1-images
   - caris-v1-api
3. Check cached files
```

**4. IndexedDB**:
```
1. DevTools → Application → IndexedDB
2. Open "CarisOfflineDB"
3. Check object stores:
   - pendingDiaryEntries
   - pendingChatMessages
   - pendingMoodTracking
```

**5. Push Notifications**:
```
1. DevTools → Application → Service Workers
2. Find your SW
3. Click "Push" button
4. Verify notification appears
```

### Automated Testing

**Lighthouse PWA Audit**:
```bash
# CLI
npx lighthouse https://your-app.com --view

# Check these metrics:
- PWA Optimized: 100/100
- Installable: Yes
- Service Worker: Registered
- Offline: Works
- HTTPS: Yes
```

**PWA Builder**:
```
1. Visit https://www.pwabuilder.com/
2. Enter your URL
3. Run report
4. Check all criteria pass
```

---

## Best Practices

### 1. Cache Versioning

**Always increment cache version on updates**:
```javascript
// Before deploy
const CACHE_VERSION = 'caris-v2' // ← Increment

// Old caches automatically deleted
```

### 2. Selective Caching

**Don't cache everything**:
```javascript
// ❌ BAD: Cache all API responses
if (url.pathname.startsWith('/api/')) {
  cache.addAll(response)
}

// ✅ GOOD: Cache only specific endpoints
const CACHEABLE_ROUTES = [
  '/api/patient/profile',
  '/api/patient/mood-tracking'
]
```

### 3. Cache Size Limits

**Implement cache limits to prevent storage issues**:
```javascript
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > maxSize) {
    await cache.delete(keys[0]) // Remove oldest
    limitCacheSize(cacheName, maxSize) // Recursive
  }
}
```

### 4. User Feedback

**Always inform users about offline state**:
```typescript
import { OfflineMessage } from '@/components/offline-fallback'

<OfflineMessage />
// Shows banner when offline
```

### 5. Graceful Degradation

**Disable offline-incompatible features**:
```typescript
const { isOnline } = useOnlineStatus()

<Button disabled={!isOnline}>
  Upload File {!isOnline && '(Requires connection)'}
</Button>
```

### 6. Background Sync

**Use background sync for critical data**:
```typescript
// Diary entry
const result = await saveDiaryEntry(entry)

if (!result.synced) {
  // Queued for background sync
  toast('Saved locally. Will sync when online.')
}
```

### 7. Update Management

**Notify users of updates**:
```typescript
// In sw-register.tsx
toast({
  title: 'Update available',
  description: 'A new version is ready.',
  action: <Button onClick={updateSW}>Update</Button>
})
```

---

## Troubleshooting

### Issue 1: Service Worker Not Registering

**Symptoms**: No SW in DevTools

**Solutions**:
1. Check HTTPS (SW requires secure context)
2. Verify sw.js is in public/ directory
3. Check browser console for errors
4. Clear browser cache and retry

### Issue 2: Offline Mode Not Working

**Symptoms**: White screen when offline

**Solutions**:
1. Verify offline page cached in STATIC_ASSETS
2. Check network-first strategy for fallback
3. Inspect cache contents in DevTools
4. Test with DevTools offline mode

### Issue 3: Background Sync Not Triggering

**Symptoms**: Data not syncing when online

**Solutions**:
1. Check sync registration: `reg.sync.register('tag')`
2. Verify sync event listener in SW
3. Check IndexedDB has pending items
4. Test in incognito (no extension interference)

### Issue 4: Updates Not Showing

**Symptoms**: New version deployed but not active

**Solutions**:
1. Close all tabs with the app
2. Hard refresh (Ctrl+Shift+R)
3. Unregister SW and re-register
4. Check cache version incremented

---

## Performance

### Metrics

**Target Metrics**:
- **First Load**: < 2s on 3G
- **Time to Interactive**: < 3s
- **Lighthouse PWA**: 100/100
- **Cache Hit Rate**: > 80%

**Monitoring**:
```javascript
// Track cache performance
let cacheHits = 0
let cacheMisses = 0

// In fetch handler
const cached = await caches.match(request)
if (cached) {
  cacheHits++
  console.log(`Cache hit rate: ${cacheHits / (cacheHits + cacheMisses)}`)
}
```

---

## Security

### Best Practices

1. **HTTPS Only**: Service workers require HTTPS
2. **Scope Restriction**: Limit SW scope to app only
3. **Cache Validation**: Verify cached responses
4. **No Sensitive Data**: Don't cache auth tokens or passwords
5. **CSP Headers**: Implement Content Security Policy

---

## Resources

- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev PWA](https://web.dev/progressive-web-apps/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)

---

## Summary

The CÁRIS PWA provides:

✅ **Full offline functionality** for critical features
✅ **Background sync** for data created offline
✅ **Push notifications** for real-time updates
✅ **Installable** with custom prompts
✅ **Auto-updating** with user notifications
✅ **Performance optimized** with smart caching

The implementation follows best practices and provides a native app-like experience for mental health support, even in offline scenarios.
