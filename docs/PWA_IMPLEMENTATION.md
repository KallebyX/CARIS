# Progressive Web App (PWA) Implementation

This document describes the PWA implementation for the CÁRIS platform, including offline support, service workers, and installability features.

## Overview

The CÁRIS platform is now a fully-functional Progressive Web App that provides:

- **Offline Support**: Core functionality works without internet connection
- **Installability**: Users can install the app on their devices
- **Background Sync**: Failed requests are queued and synced when online
- **Push Notifications**: Real-time notifications through service workers
- **Fast Loading**: Aggressive caching strategies for optimal performance

## Architecture

### Components

1. **Service Worker** (`/public/sw.js`)
   - Handles caching strategies
   - Manages offline fallbacks
   - Implements background sync
   - Handles push notifications

2. **PWA Manifest** (`/public/manifest.json`)
   - Defines app metadata
   - Specifies icons and theme colors
   - Configures display mode and orientation

3. **Service Worker Registration** (`/app/sw-register.tsx`)
   - Registers and manages service worker lifecycle
   - Handles updates and notifications
   - Provides install prompt management

4. **Offline Detection** (`/lib/offline-detection.ts`)
   - Network status monitoring
   - Request queue management
   - Connectivity testing

5. **Offline Storage** (`/lib/offline-storage.ts`)
   - IndexedDB wrapper for offline data
   - Stores diary entries, chat messages, mood tracking
   - Sync management

6. **UI Components**
   - `OfflineIndicator`: Shows connection status
   - `OfflineFallback`: Offline error pages
   - `OnlineStatusBadge`: Simple status badge

7. **React Hooks** (`/hooks/use-online-status.ts`)
   - `useOnlineStatus`: Comprehensive network monitoring
   - `useIsOnline`: Simple online/offline detection
   - `useIsFastConnection`: Connection speed detection

## Caching Strategies

### Static Assets (Cache-First)

Files that rarely change are cached aggressively:
- JavaScript bundles
- CSS files
- Fonts (Google Fonts, local fonts)
- Images and icons

### API Routes (Network-First)

API endpoints prioritize fresh data:
- User profiles
- Diary entries
- Chat messages
- Mood tracking
- Session data

When offline, cached data is served as fallback.

### HTML Pages (Network-First)

Application pages are fetched from network first:
- Dashboard pages
- Forms and interfaces
- Dynamic content

When offline, the `/offline` fallback page is shown.

### Images (Cache-First)

Images are cached on first load:
- Profile pictures
- Uploaded photos
- UI assets

Maximum 60 cached images with LRU eviction.

## Offline Features

### Data Storage

The following data types can be saved offline:

1. **Diary Entries**
   - Title, content, mood, tags
   - Automatically synced when online
   - Stored in IndexedDB

2. **Chat Messages**
   - Message content and metadata
   - Queued for sending when online
   - Delivered with guaranteed order

3. **Mood Tracking**
   - Mood ratings and notes
   - Daily tracking data
   - Synced periodically

### Sync Mechanism

Failed requests are automatically:
1. Stored in IndexedDB
2. Queued for retry
3. Processed when connection restored
4. Removed after successful sync

Maximum 3 retry attempts per request.

### Background Sync

When supported by the browser, background sync ensures:
- Automatic retry of failed requests
- Sync even after closing the app
- Battery-efficient operations

Sync tags:
- `sync-diary-entries`
- `sync-chat-messages`
- `sync-mood-tracking`

## Installation

### Requirements

- HTTPS connection (or localhost for development)
- Modern browser with service worker support
- Manifest with required fields

### User Experience

1. **Install Prompt**
   - Shown 5 seconds after page load
   - Can be dismissed or accepted
   - Only shown once per session

2. **Installation Methods**
   - Browser's "Add to Home Screen" option
   - Custom install button (if implemented)
   - Browser address bar install icon

3. **Post-Install**
   - Toast notification confirms installation
   - App opens in standalone mode
   - Native app-like experience

## Push Notifications

### Setup

Push notifications require:
1. User permission
2. Service worker registration
3. Push subscription
4. Backend integration

### Notification Types

- New chat messages
- Session reminders
- SOS alerts (high priority)
- Mood tracking reminders
- System notifications

### Implementation

```javascript
// Request permission
const permission = await Notification.requestPermission()

// Subscribe to push
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: 'YOUR_VAPID_KEY'
})

// Send to backend
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
})
```

## Configuration

### Manifest Settings

Key manifest properties:

```json
{
  "name": "CÁRIS - Clareza Existencial",
  "short_name": "CÁRIS",
  "theme_color": "#14b8a6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

### Service Worker Config

Cache names and versions:
```javascript
const CACHE_VERSION = 'caris-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const API_CACHE = `${CACHE_VERSION}-api`
```

### Next.js Config

Headers for PWA support:
```javascript
headers: async () => {
  return [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache' },
        { key: 'Service-Worker-Allowed', value: '/' }
      ]
    }
  ]
}
```

## Usage Examples

### Detect Online Status

```typescript
import { useOnlineStatus } from '@/hooks/use-online-status'

function MyComponent() {
  const { isOnline, status, pendingRequestsCount } = useOnlineStatus({
    onOnline: () => console.log('Back online!'),
    onOffline: () => console.log('Gone offline!')
  })

  return (
    <div>
      Status: {status}
      {pendingRequestsCount > 0 && (
        <span>{pendingRequestsCount} pending</span>
      )}
    </div>
  )
}
```

### Save Data Offline

```typescript
import { saveDiaryEntryOffline } from '@/lib/offline-storage'

async function saveDiary(title: string, content: string) {
  const id = await saveDiaryEntryOffline({
    title,
    content,
    mood: 'happy',
    tags: ['personal']
  })

  console.log('Saved offline with ID:', id)
}
```

### Queue Failed Requests

```typescript
import { queueRequest } from '@/lib/offline-detection'

async function createEntry(data: any) {
  try {
    const response = await fetch('/api/diary/entries', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    if (!response.ok) throw new Error('Failed')
  } catch (error) {
    // Queue for later
    queueRequest('/api/diary/entries', 'POST', data)
  }
}
```

### Show Offline Indicator

```typescript
import { OfflineIndicator } from '@/components/offline-indicator'

function Layout({ children }) {
  return (
    <>
      {children}
      <OfflineIndicator position="bottom-right" showSync />
    </>
  )
}
```

## Testing

### Development

1. **Service Worker**
   ```bash
   # Start dev server
   pnpm dev

   # Open Chrome DevTools > Application > Service Workers
   # Verify registration and activation
   ```

2. **Offline Mode**
   - Chrome DevTools > Network > Toggle offline
   - Test navigation and functionality
   - Verify offline fallback pages

3. **Cache Inspection**
   - Chrome DevTools > Application > Cache Storage
   - Verify cached resources
   - Test cache invalidation

### Production

1. **Lighthouse Audit**
   ```bash
   # Run Lighthouse PWA audit
   lighthouse https://your-domain.com --view
   ```

   Required scores:
   - PWA: 100
   - Performance: >90
   - Accessibility: >90

2. **PWA Checklist**
   - [x] HTTPS enabled
   - [x] Responsive design
   - [x] Manifest complete
   - [x] Service worker registered
   - [x] Offline fallback
   - [ ] Icons generated (see below)
   - [ ] Push notifications configured

### Browser Testing

Test on multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (iOS and macOS)
- Samsung Internet

Known limitations:
- Safari: Limited service worker support
- iOS: No background sync
- Firefox: Different push API

## Icon Generation

### Required Icons

Generate PWA icons in these sizes:
- 72x72, 96x96, 128x128, 144x144
- 152x152, 192x192, 384x384, 512x512

### Generation Tools

```bash
# Using PWA Asset Generator
npx @vite-pwa/assets-generator \
  --preset minimal \
  public/placeholder-logo.png

# Or use online tools:
# - https://realfavicongenerator.net/
# - https://www.pwabuilder.com/imageGenerator
```

### Design Guidelines

- Start with 512x512 source image
- Use transparent background
- Keep important content in center 80%
- Test maskable icon cropping
- Use CÁRIS brand colors

## Deployment

### Environment Variables

No additional environment variables required for basic PWA.

For push notifications:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_key
VAPID_PRIVATE_KEY=your_key
```

### Build

```bash
# Build for production
pnpm build

# Verify service worker
# Check dist/public/sw.js exists
```

### Hosting Requirements

- HTTPS mandatory (free with Vercel/Netlify)
- Proper MIME types for manifest.json
- Service worker served from root scope
- Cache headers configured correctly

### Vercel Deployment

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

## Troubleshooting

### Service Worker Not Registering

1. Check HTTPS (required except localhost)
2. Verify `/sw.js` is accessible
3. Check browser console for errors
4. Ensure no conflicting service workers

### Offline Features Not Working

1. Verify IndexedDB is enabled
2. Check storage quota limits
3. Test service worker activation
4. Verify cache strategies

### Install Prompt Not Showing

1. Ensure manifest is valid
2. Check all required fields present
3. Verify icons are accessible
4. Test on supported browser
5. Check if already installed

### Background Sync Failing

1. Verify browser support
2. Check sync tag registration
3. Ensure service worker active
3. Test network connectivity

## Performance

### Metrics

Target performance metrics:
- First Contentful Paint: <1.8s
- Time to Interactive: <3.8s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

### Optimization Tips

1. **Preload Critical Assets**
   ```html
   <link rel="preload" href="/fonts/inter.woff2" as="font" />
   ```

2. **Cache Versioning**
   - Update CACHE_VERSION when deploying
   - Old caches automatically cleaned up

3. **Minimize Service Worker**
   - Keep sw.js small (<50KB)
   - Avoid heavy computations
   - Use importScripts for libraries

## Security

### Best Practices

1. **HTTPS Only**: Service workers only work over HTTPS
2. **Validate Origins**: Check request origins in SW
3. **Sanitize Data**: Validate all cached data
4. **Scope Limitation**: Limit SW scope to application
5. **Update Strategy**: Force update on security patches

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline' 'unsafe-eval';
               connect-src 'self' https://api.caris.com;
               img-src 'self' data: https:;">
```

## Future Enhancements

### Planned Features

1. **Web Share API**: Share diary entries
2. **File System Access**: Local file backups
3. **Periodic Background Sync**: Auto-refresh data
4. **App Shortcuts**: Quick actions from icon
5. **Better iOS Support**: Enhanced Safari PWA features

### Experimental Features

- WebAssembly for offline AI features
- WebRTC for peer-to-peer chat
- Web Bluetooth for integrations
- Credential Management API

## Resources

### Documentation

- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Next.js: PWA](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)

### Tools

- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

## Support

For issues or questions about the PWA implementation:
1. Check browser console for errors
2. Review service worker logs
3. Test in Chrome DevTools Application tab
4. Verify manifest validation

---

**Last Updated**: 2025-11-12
**Version**: 1.0.0
**Maintainer**: CÁRIS Development Team
