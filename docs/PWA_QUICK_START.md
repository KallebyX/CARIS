# PWA Quick Start Guide

Quick reference for using PWA features in CÁRIS.

## Common Tasks

### Check if User is Online

```typescript
import { useIsOnline } from '@/hooks/use-online-status'

function MyComponent() {
  const isOnline = useIsOnline()

  return <div>{isOnline ? 'Online' : 'Offline'}</div>
}
```

### Get Detailed Network Status

```typescript
import { useOnlineStatus } from '@/hooks/use-online-status'

function MyComponent() {
  const {
    isOnline,
    status,           // 'online' | 'offline' | 'slow'
    networkInfo,      // Connection details
    pendingRequestsCount,
    isSyncing,
    syncPendingRequests
  } = useOnlineStatus()

  return (
    <div>
      <p>Status: {status}</p>
      <p>Pending: {pendingRequestsCount}</p>
      <button onClick={syncPendingRequests}>
        Sync Now
      </button>
    </div>
  )
}
```

### Save Data Offline

```typescript
import {
  saveDiaryEntryOffline,
  saveChatMessageOffline,
  saveMoodTrackingOffline
} from '@/lib/offline-storage'

// Save diary entry
const id = await saveDiaryEntryOffline({
  title: 'My Entry',
  content: 'Content here',
  mood: 'happy',
  tags: ['personal']
})

// Save chat message
await saveChatMessageOffline({
  conversationId: '123',
  senderId: 'user-id',
  content: 'Hello!'
})

// Save mood tracking
await saveMoodTrackingOffline({
  mood: 8,
  notes: 'Feeling great',
  date: '2025-11-12'
})
```

### Queue Failed API Requests

```typescript
import { queueRequest } from '@/lib/offline-detection'

async function saveData(data: any) {
  try {
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    if (!res.ok) throw new Error('Failed')
  } catch (error) {
    // Queue for retry when online
    queueRequest('/api/endpoint', 'POST', data)
    console.log('Request queued for later')
  }
}
```

### Show Offline Indicator

```typescript
import { OfflineIndicator } from '@/components/offline-indicator'

function Layout() {
  return (
    <>
      {/* ... your content ... */}

      <OfflineIndicator
        position="bottom-right"
        showDetails
        showSync
      />
    </>
  )
}
```

### Show Offline Message

```typescript
import { OfflineMessage } from '@/components/offline-fallback'

function MyForm() {
  return (
    <div>
      <OfflineMessage />

      <form>
        {/* Your form fields */}
      </form>
    </div>
  )
}
```

### Handle Offline in Forms

```typescript
import { useOnlineStatus } from '@/hooks/use-online-status'
import { saveDiaryEntryOffline } from '@/lib/offline-storage'

function DiaryForm() {
  const { isOnline } = useOnlineStatus()

  async function handleSubmit(data: any) {
    if (isOnline) {
      // Send to server
      await fetch('/api/diary/entries', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } else {
      // Save offline
      await saveDiaryEntryOffline(data)
      alert('Saved offline. Will sync when online.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

### Check if App is Installed

```typescript
import { isStandalone } from '@/app/sw-register'

function Header() {
  const isPWA = isStandalone()

  return (
    <header>
      {isPWA ? (
        <span>Running as PWA</span>
      ) : (
        <button onClick={showInstallPrompt}>
          Install App
        </button>
      )}
    </header>
  )
}
```

### Send Message to Service Worker

```typescript
import { sendMessageToSW } from '@/app/sw-register'

// Cache specific URLs
sendMessageToSW({
  type: 'CACHE_URLS',
  urls: ['/dashboard', '/profile']
})

// Clear all caches
sendMessageToSW({
  type: 'CLEAR_CACHE'
})
```

### Trigger Manual Update Check

```typescript
import { triggerSWUpdate } from '@/app/sw-register'

function Settings() {
  return (
    <button onClick={triggerSWUpdate}>
      Check for Updates
    </button>
  )
}
```

## File Locations

```
/home/user/CARIS/
├── app/
│   ├── sw-register.tsx          # Service Worker registration
│   ├── offline/page.tsx         # Offline fallback page
│   └── layout.tsx               # PWA meta tags
│
├── components/
│   ├── offline-indicator.tsx    # Connection status UI
│   └── offline-fallback.tsx     # Offline error pages
│
├── hooks/
│   └── use-online-status.ts     # Network status hooks
│
├── lib/
│   ├── offline-detection.ts     # Network utilities
│   └── offline-storage.ts       # IndexedDB wrapper
│
├── public/
│   ├── sw.js                    # Service Worker
│   ├── manifest.json            # PWA Manifest
│   └── icons/                   # App icons
│
└── docs/
    ├── PWA_IMPLEMENTATION.md    # Full documentation
    └── PWA_QUICK_START.md       # This file
```

## API Endpoints

- `GET /api/health` - Health check with full diagnostics
- `HEAD /api/health` - Lightweight connectivity ping

## IndexedDB Stores

```typescript
import { STORES } from '@/lib/offline-storage'

STORES.DIARY_ENTRIES          // Synced diary entries
STORES.CHAT_MESSAGES          // Synced chat messages
STORES.MOOD_TRACKING          // Synced mood data
STORES.PENDING_DIARY_ENTRIES  // Pending syncs
STORES.PENDING_CHAT_MESSAGES  // Pending syncs
STORES.PENDING_MOOD_TRACKING  // Pending syncs
STORES.SESSIONS               // Session data
STORES.USER_DATA              // User preferences
```

## Service Worker Events

The service worker listens for:

- `install` - Initial installation
- `activate` - Activation and cleanup
- `fetch` - Network requests
- `sync` - Background sync
- `push` - Push notifications
- `notificationclick` - Notification interactions
- `message` - Messages from client

## Cache Names

```javascript
CACHE_VERSION = 'caris-v1'
STATIC_CACHE = 'caris-v1-static'      // JS, CSS, fonts
DYNAMIC_CACHE = 'caris-v1-dynamic'    // HTML pages
IMAGE_CACHE = 'caris-v1-images'       // Images
API_CACHE = 'caris-v1-api'            // API responses
```

## Development Tips

### Test Offline Mode

```bash
# Chrome DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Refresh page
```

### Clear Service Worker

```bash
# Chrome DevTools
1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Click "Unregister"
4. Clear site data if needed
```

### View Cached Data

```bash
# Chrome DevTools
1. Open DevTools (F12)
2. Go to Application > Cache Storage
3. Expand cache names
4. Inspect cached resources
```

### Check IndexedDB

```bash
# Chrome DevTools
1. Open DevTools (F12)
2. Go to Application > IndexedDB
3. Expand CarisOfflineDB
4. Inspect stored data
```

## Troubleshooting

### Service Worker Not Working

1. Verify HTTPS (required in production)
2. Check `/sw.js` is accessible
3. Look for console errors
4. Try hard refresh (Ctrl+Shift+R)

### Data Not Syncing

1. Check network status
2. Verify pending requests count
3. Manually trigger sync
4. Check browser console for errors

### Icons Not Showing

1. Generate icons (see `/public/icons/README.md`)
2. Place in `/public/icons/` directory
3. Verify paths in manifest.json
4. Clear cache and reload

## Next Steps

1. Generate app icons (`/public/icons/README.md`)
2. Configure push notifications
3. Test on mobile devices
4. Run Lighthouse audit
5. Deploy to production (HTTPS required)

## Resources

- Full documentation: `/docs/PWA_IMPLEMENTATION.md`
- Icon generation: `/public/icons/README.md`
- Service Worker: `/public/sw.js`
- Manifest: `/public/manifest.json`

---

**Need Help?** Check the full documentation or browser console for errors.
