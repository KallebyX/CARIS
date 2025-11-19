/**
 * Lazy-loaded Meditation Charts Component
 *
 * This component uses React.lazy() to code-split the MeditationCharts component,
 * which includes the Recharts library for data visualization.
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Chart library only loads when meditation stats are viewed
 * - Improves page load performance for users who don't access meditation features
 *
 * Usage:
 * import { LazyMeditationCharts } from '@/components/lazy/lazy-meditation-charts'
 *
 * <LazyMeditationCharts userId={userId} />
 */

"use client"

import { lazy, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load the actual MeditationCharts component
const MeditationChartsComponent = lazy(() => import("@/components/meditation/meditation-charts"))

/**
 * Loading skeleton for meditation charts
 * Displays while the charts component is being loaded
 */
function MeditationChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Minutos de Meditação</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sessões por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Lazy-loaded MeditationCharts with Suspense boundary
 * @param props - MeditationCharts component props
 */
export function LazyMeditationCharts(props: { userId: number }) {
  return (
    <Suspense fallback={<MeditationChartsSkeleton />}>
      <MeditationChartsComponent {...props} />
    </Suspense>
  )
}

export default LazyMeditationCharts
