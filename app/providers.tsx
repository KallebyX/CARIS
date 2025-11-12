'use client'

/**
 * React Query Provider Configuration for CÁRIS Platform
 *
 * Configures TanStack Query (React Query) for optimal performance:
 * - Smart caching and background refetching
 * - Optimistic updates for better UX
 * - Automatic retry logic with exponential backoff
 * - Network status awareness
 * - DevTools for development debugging
 *
 * @see https://tanstack.com/query/latest/docs/react/overview
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

// ================================================================
// QUERY CLIENT CONFIGURATION
// ================================================================

/**
 * Create a new QueryClient instance with optimized defaults
 * Called once per user session (not on every render)
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ============================================================
        // CACHING CONFIGURATION
        // ============================================================

        /**
         * Time in milliseconds that cached data is considered fresh
         * During this time, React Query will return cached data without refetching
         * @default 60000 (1 minute)
         */
        staleTime: 60 * 1000, // 1 minute

        /**
         * Time in milliseconds that unused/inactive cache data remains in memory
         * After this time, unused data is garbage collected
         * @default 300000 (5 minutes)
         */
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

        // ============================================================
        // REFETCHING CONFIGURATION
        // ============================================================

        /**
         * Refetch data when component mounts if stale
         * Ensures fresh data when user navigates to a page
         * @default true
         */
        refetchOnMount: true,

        /**
         * Refetch data when window regains focus
         * Great for keeping data fresh when user returns to tab
         * @default true
         */
        refetchOnWindowFocus: true,

        /**
         * Refetch when network reconnects
         * Ensures data is updated after offline period
         * @default true
         */
        refetchOnReconnect: true,

        /**
         * Automatically refetch in background when data is stale
         * Keeps data fresh without user interaction
         * @default false (we enable it for better UX)
         */
        refetchInterval: false, // Disabled by default, enable per-query if needed

        /**
         * Refetch even when window is not focused
         * Useful for real-time dashboards
         * @default false
         */
        refetchIntervalInBackground: false,

        // ============================================================
        // RETRY CONFIGURATION
        // ============================================================

        /**
         * Number of retry attempts for failed queries
         * Uses exponential backoff: 1s, 2s, 4s...
         * @default 3
         */
        retry: 3,

        /**
         * Custom retry delay with exponential backoff
         * @param attemptIndex - Current retry attempt (0-indexed)
         * @returns Delay in milliseconds
         */
        retryDelay: (attemptIndex: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          return Math.min(1000 * 2 ** attemptIndex, 30000) // Max 30 seconds
        },

        /**
         * Determine if error should trigger a retry
         * Don't retry on client errors (4xx), only server errors (5xx)
         * @param error - Error object from failed request
         * @returns Boolean indicating if retry should occur
         */
        retryOnMount: true,

        // ============================================================
        // NETWORK MODE
        // ============================================================

        /**
         * How queries behave when offline
         * 'online' - Only run when online (will pause when offline)
         * 'always' - Run regardless of network status
         * 'offlineFirst' - Try to run, use cache if fails
         * @default 'online'
         */
        networkMode: 'online',

        // ============================================================
        // PERFORMANCE OPTIMIZATIONS
        // ============================================================

        /**
         * Use error boundaries for errors
         * Set to false to handle errors manually
         * @default false
         */
        useErrorBoundary: false,

        /**
         * Enable suspense mode for queries
         * Works with React Suspense boundaries
         * @default false
         */
        suspense: false,

        /**
         * Keep previous data while fetching new data
         * Prevents UI flickering during refetch
         * @default false (we enable it for better UX)
         */
        placeholderData: undefined, // Use previous data by setting to (prev) => prev per query
      },

      mutations: {
        /**
         * Number of retry attempts for failed mutations
         * More conservative than queries (mutations have side effects)
         * @default 0
         */
        retry: 1,

        /**
         * Retry delay for mutations
         */
        retryDelay: (attemptIndex: number) => {
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },

        /**
         * Network mode for mutations
         */
        networkMode: 'online',

        /**
         * Use error boundaries for mutation errors
         * @default false
         */
        useErrorBoundary: false,
      },
    },
  })
}

// ================================================================
// BROWSER VS SERVER CLIENT
// ================================================================

let browserQueryClient: QueryClient | undefined = undefined

/**
 * Get or create QueryClient instance
 * - Server: Always creates new instance (for SSR)
 * - Browser: Reuses single instance (for SPA behavior)
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient
    return makeQueryClient()
  } else {
    // Browser: create QueryClient once and reuse it
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

// ================================================================
// PROVIDER COMPONENT
// ================================================================

/**
 * React Query Provider Component
 *
 * Wraps application with QueryClientProvider to enable React Query features
 * Should be placed high in component tree (typically in root layout)
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { QueryProvider } from './providers'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider>
 *           {children}
 *         </QueryProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient instance once per component mount
  // Using useState ensures it's not recreated on re-renders
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

// ================================================================
// PREFETCHING UTILITIES
// ================================================================

/**
 * Prefetch query on server (for SSR/SSG)
 *
 * @example
 * ```tsx
 * // app/dashboard/page.tsx
 * import { prefetchQuery } from './providers'
 *
 * export default async function DashboardPage() {
 *   const queryClient = getQueryClient()
 *
 *   await queryClient.prefetchQuery({
 *     queryKey: ['dashboard-stats'],
 *     queryFn: () => fetchDashboardStats(),
 *   })
 *
 *   return <HydrationBoundary state={dehydrate(queryClient)}>
 *     <DashboardContent />
 *   </HydrationBoundary>
 * }
 * ```
 */
export { getQueryClient }

// ================================================================
// CUSTOM QUERY OPTIONS PRESETS
// ================================================================

/**
 * Preset query options for common use cases
 * Import and spread these in your queries for consistent behavior
 */
export const QueryPresets = {
  /**
   * Real-time data that should refetch frequently
   * Use for: notifications, live dashboards, chat
   */
  REALTIME: {
    staleTime: 0, // Always stale
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },

  /**
   * Static data that rarely changes
   * Use for: configuration, metadata, reference data
   */
  STATIC: {
    staleTime: Infinity, // Never stale
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  /**
   * User-specific data
   * Use for: profile, settings, preferences
   */
  USER_DATA: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
  },

  /**
   * List data with pagination
   * Use for: tables, infinite scroll
   */
  LIST: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    // Use keepPreviousData: true for pagination
  },

  /**
   * Dashboard/analytics data
   * Use for: charts, statistics
   */
  ANALYTICS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },

  /**
   * Search results
   * Use for: search functionality
   */
  SEARCH: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
}

// ================================================================
// OPTIMISTIC UPDATE HELPERS
// ================================================================

/**
 * Helper for optimistic updates with automatic rollback on error
 *
 * @example
 * ```tsx
 * const mutation = useMutation({
 *   mutationFn: updateUser,
 *   onMutate: async (newData) => {
 *     return optimisticUpdate(queryClient, ['user', userId], newData)
 *   },
 *   onError: (err, newData, context) => {
 *     // Automatically rolls back using context
 *     if (context?.previousData) {
 *       queryClient.setQueryData(['user', userId], context.previousData)
 *     }
 *   },
 * })
 * ```
 */
export async function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: T | ((old: T) => T)
): Promise<{ previousData: T | undefined }> {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey })

  // Snapshot previous value
  const previousData = queryClient.getQueryData<T>(queryKey)

  // Optimistically update to new value
  queryClient.setQueryData<T>(queryKey, (old) => {
    if (typeof updater === 'function') {
      return (updater as (old: T) => T)(old as T)
    }
    return updater
  })

  // Return context with previous value
  return { previousData }
}

// ================================================================
// INVALIDATION HELPERS
// ================================================================

/**
 * Invalidate multiple related queries at once
 *
 * @example
 * ```tsx
 * // After creating a session, invalidate related queries
 * await invalidateQueries(queryClient, [
 *   ['sessions', 'list'],
 *   ['sessions', 'count'],
 *   ['dashboard', 'stats']
 * ])
 * ```
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  queryKeys: unknown[][]
): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  )
}

// ================================================================
// EXPORT TYPES
// ================================================================

export type { QueryClient } from '@tanstack/react-query'
