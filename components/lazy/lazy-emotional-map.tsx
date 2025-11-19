/**
 * Lazy-loaded Emotional Map Component
 *
 * This component uses React.lazy() to code-split the EmotionalMap chart
 * component, which includes the heavy Recharts library.
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Chart library only loads when component is actually rendered
 * - Improves initial page load performance
 *
 * Usage:
 * import { LazyEmotionalMap } from '@/components/lazy/lazy-emotional-map'
 *
 * <LazyEmotionalMap data={emotionalData} />
 */

"use client"

import { lazy, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load the actual EmotionalMap component
const EmotionalMapComponent = lazy(() => import("@/components/emotional-map"))

/**
 * Loading skeleton for the emotional map chart
 * Displays while the chart component is being loaded
 */
function EmotionalMapSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mapa Emocional</span>
          <Skeleton className="h-10 w-32" /> {/* Button skeleton */}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" /> {/* Legend skeleton */}
          <Skeleton className="h-[400px] w-full" /> {/* Chart skeleton */}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Lazy-loaded EmotionalMap with Suspense boundary
 * @param props - EmotionalMap component props
 */
export function LazyEmotionalMap(props: any) {
  return (
    <Suspense fallback={<EmotionalMapSkeleton />}>
      <EmotionalMapComponent {...props} />
    </Suspense>
  )
}

export default LazyEmotionalMap
