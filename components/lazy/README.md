# Lazy-Loaded Components

This directory contains lazy-loaded wrappers for heavy components to improve bundle size and initial page load performance.

## Overview

Code splitting allows you to split your application bundle into smaller chunks that can be loaded on demand. This is especially important for:

- **Chart libraries** (Recharts, Chart.js) - Large visualization libraries
- **Rich text editors** - Heavy WYSIWYG editors
- **Video players** - Media processing libraries
- **PDF viewers** - Document rendering libraries
- **Complex dashboards** - Feature-rich admin panels

## How It Works

### 1. React.lazy()

```typescript
const HeavyComponent = lazy(() => import("./HeavyComponent"))
```

The component code is only downloaded when it's actually rendered.

### 2. Suspense Boundary

```typescript
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

Shows a loading state while the component is being fetched.

### 3. Code Splitting Result

```
// Before (single bundle):
main.js: 850KB

// After (code split):
main.js: 450KB
chunk-charts.js: 200KB (loaded only when charts are shown)
chunk-editor.js: 200KB (loaded only when editor is shown)
```

## Available Lazy Components

### LazyEmotionalMap
**File:** `lazy-emotional-map.tsx`
**Original:** `@/components/emotional-map`
**Size saved:** ~200KB (Recharts library)

Usage:
```typescript
import { LazyEmotionalMap } from '@/components/lazy/lazy-emotional-map'

<LazyEmotionalMap data={emotionalData} />
```

### LazyMeditationCharts
**File:** `lazy-meditation-charts.tsx`
**Original:** `@/components/meditation/meditation-charts`
**Size saved:** ~200KB (Recharts library)

Usage:
```typescript
import { LazyMeditationCharts } from '@/components/lazy/lazy-meditation-charts'

<LazyMeditationCharts userId={userId} />
```

## Creating New Lazy Components

### Template

```typescript
"use client"

import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// 1. Lazy load the component
const HeavyComponent = lazy(() => import("@/components/HeavyComponent"))

// 2. Create loading skeleton
function HeavyComponentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

// 3. Export lazy wrapper with Suspense
export function LazyHeavyComponent(props: any) {
  return (
    <Suspense fallback={<HeavyComponentSkeleton />}>
      <HeavyComponent {...props} />
    </Suspense>
  )
}

export default LazyHeavyComponent
```

### Guidelines

1. **Name consistently**: Prefix with `Lazy` (e.g., `LazyChart`, `LazyEditor`)
2. **Create meaningful skeletons**: Match the layout of the actual component
3. **Document bundle savings**: Note the approximate size reduction
4. **Use for components >50KB**: Only lazy-load truly heavy components
5. **Consider user experience**: Don't lazy-load critical above-the-fold content

## When to Use Lazy Loading

### ✅ Good Candidates

- Charts and data visualizations
- Rich text editors
- Video/audio players
- PDF viewers
- Modal dialogs with heavy content
- Admin panels with many features
- Third-party widgets
- Optional features (settings panels, etc.)

### ❌ Poor Candidates

- Above-the-fold content
- Critical UI components (buttons, forms)
- Small components (<50KB)
- Components needed immediately on page load
- Core navigation

## Performance Impact

### Bundle Analysis

Run bundle analyzer to see the impact:

```bash
npm run analyze
```

This opens an interactive treemap showing:
- Total bundle size
- Size of each chunk
- Which imports contribute most to bundle size

### Expected Results

With proper code splitting:

- **Initial Load**: 30-50% faster
- **Time to Interactive**: 25-40% improvement
- **Lighthouse Score**: +10-20 points
- **First Contentful Paint**: 0.5-1s improvement

## Next.js Configuration

The project is already configured for optimal code splitting in `next.config.js`:

```javascript
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-icons',
    'recharts',  // ← Optimized for tree-shaking
    'date-fns',
  ],
}
```

## Route-Level Code Splitting

Next.js automatically code-splits at the route level:

```
app/
  page.tsx           → chunk-home.js
  dashboard/
    page.tsx         → chunk-dashboard.js
    sessions/
      page.tsx       → chunk-sessions.js
```

Each page is a separate chunk loaded only when navigating to that route.

## Component-Level Code Splitting

For heavy components within a route, use lazy loading:

```typescript
// ❌ BAD: Always bundled, even if never shown
import { HeavyChart } from '@/components/HeavyChart'

function Dashboard() {
  const [showChart, setShowChart] = useState(false)
  return <div>{showChart && <HeavyChart />}</div>
}

// ✅ GOOD: Only loaded when showChart is true
import { LazyHeavyChart } from '@/components/lazy/lazy-heavy-chart'

function Dashboard() {
  const [showChart, setShowChart] = useState(false)
  return <div>{showChart && <LazyHeavyChart />}</div>
}
```

## Testing Lazy Components

### Visual Testing

1. Open browser DevTools → Network tab
2. Navigate to page with lazy component
3. Verify chunk is loaded only when component appears
4. Check for proper loading state

### Performance Testing

1. Run Lighthouse audit
2. Check "Reduce JavaScript execution time"
3. Verify "Reduce unused JavaScript"
4. Monitor Time to Interactive (TTI)

## Troubleshooting

### Error: "Hydration Mismatch"

Ensure lazy components are wrapped in `<Suspense>` with a fallback.

### Error: "Cannot read property of undefined"

Add proper error boundary around lazy components:

```typescript
<ErrorBoundary fallback={<ErrorState />}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

### Chunk Loading Failures

Handle network errors gracefully:

```typescript
const LazyComponent = lazy(() =>
  import('./Component').catch(() => {
    // Fallback to static component or error state
    return { default: () => <ErrorFallback /> }
  })
)
```

## Best Practices

1. **Progressive Enhancement**: Always provide fallbacks
2. **Loading States**: Show skeletons, not blank spaces
3. **Error Handling**: Catch import errors gracefully
4. **Preloading**: Prefetch on hover for better UX
5. **Testing**: Verify chunks load correctly in production
6. **Monitoring**: Track chunk loading errors in Sentry

## Resources

- [React Lazy](https://react.dev/reference/react/lazy)
- [Next.js Code Splitting](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Web.dev - Code Splitting](https://web.dev/code-splitting-suspense/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

## Maintenance

When adding new heavy dependencies:

1. Check bundle size impact (`npm run analyze`)
2. Create lazy wrapper if component >50KB
3. Update this README with new lazy component
4. Test loading states and error handling
5. Monitor performance metrics in production
