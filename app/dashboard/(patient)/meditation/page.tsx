/**
 * Meditation Page with Code Splitting Example
 *
 * This page demonstrates Next.js 15 code splitting best practices:
 * - Dynamic imports for heavy components
 * - Loading states with Suspense
 * - Lazy loading of non-critical UI elements
 */

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

// ================================================================
// CODE SPLITTING: Dynamic Imports
// ================================================================

/**
 * Dynamically import the MeditationLibraryComponent
 * This reduces initial page load by splitting this large component into a separate chunk
 * The component is loaded when the page renders, not during initial bundle load
 *
 * Benefits:
 * - Reduces initial JavaScript bundle size
 * - Improves Time to Interactive (TTI)
 * - Better performance on slower devices/networks
 */
const MeditationLibraryComponent = dynamic(
  () => import('@/components/meditation/meditation-library').then(mod => ({ default: mod.MeditationLibraryComponent })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    ),
    ssr: true, // Still render on server for SEO
  }
)

/**
 * Example: Lazy load statistics component (only loads when needed)
 * This component might be below the fold or in a modal
 */
const MeditationStats = dynamic(
  () => import('@/components/meditation/meditation-stats'),
  {
    loading: () => <div className="h-40 bg-gray-100 rounded animate-pulse"></div>,
  }
)

/**
 * Example: Lazy load heavy chart library
 * Only loads when user scrolls to charts section
 */
const MeditationCharts = dynamic(
  () => import('@/components/meditation/meditation-charts'),
  {
    loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse"></div>,
  }
)

export default async function MeditationPage() {
  // Verificar autenticação
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  let userId: number
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number, role: string }
    
    if (decoded.role !== 'patient') {
      redirect('/dashboard')
    }
    
    userId = decoded.userId
  } catch (error) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Meditação</h1>
        <p className="text-gray-600">
          Explore nossa biblioteca de meditações guiadas e desenvolva uma prática consistente de mindfulness.
        </p>
      </div>

      {/*
        Main meditation library - dynamically imported
        Shows loading skeleton while component bundle is being fetched
      */}
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        }
      >
        <MeditationLibraryComponent userId={userId} />
      </Suspense>

      {/*
        Statistics section - lazy loaded
        Only fetches when component is in viewport (intersection observer)
        This section is typically below the fold
      */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Suas Estatísticas</h2>
        <Suspense fallback={<div className="h-40 bg-gray-100 rounded animate-pulse"></div>}>
          <MeditationStats userId={userId} />
        </Suspense>
      </div>

      {/*
        Charts section - lazy loaded with heavy dependencies
        Chart libraries (recharts, chart.js) can be large
        Only load when user scrolls to this section
      */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Progresso ao Longo do Tempo</h2>
        <Suspense fallback={<div className="h-96 bg-gray-100 rounded animate-pulse"></div>}>
          <MeditationCharts userId={userId} />
        </Suspense>
      </div>
    </div>
  )
}