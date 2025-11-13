"use client"

import { useState, useEffect } from 'react'

/**
 * Breakpoint constants matching Tailwind CSS defaults
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * Custom hook for media queries
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Only run on client side
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Define listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])

  // Return false during SSR to prevent hydration mismatch
  if (!mounted) return false

  return matches
}

/**
 * Hook to detect current breakpoint
 * @returns Current breakpoint name or 'xs' for mobile
 */
export function useBreakpoint(): Breakpoint | 'xs' {
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm}px)`)
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`)
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl}px)`)
  const is2Xl = useMediaQuery(`(min-width: ${breakpoints['2xl']}px)`)

  if (is2Xl) return '2xl'
  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  if (isSm) return 'sm'
  return 'xs'
}

/**
 * Hook to detect if device is mobile
 * @param breakpoint - Maximum breakpoint to consider as mobile (default: 'md')
 * @returns boolean indicating if device is mobile
 */
export function useIsMobile(breakpoint: Breakpoint = 'md'): boolean {
  return !useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`)
}

/**
 * Hook to detect if device is tablet
 * @returns boolean indicating if device is tablet size
 */
export function useIsTablet(): boolean {
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`)
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
  return isMd && !isLg
}

/**
 * Hook to detect if device is desktop
 * @returns boolean indicating if device is desktop size
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
}

/**
 * Hook to detect viewport dimensions
 * @returns Object with width and height
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)

    // Set initial value
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return viewport
}

/**
 * Hook to detect device orientation
 * @returns 'portrait' | 'landscape'
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth
      ? 'portrait'
      : 'landscape'
  )

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      )
    }

    window.addEventListener('resize', handleOrientationChange)

    // Set initial value
    handleOrientationChange()

    return () => window.removeEventListener('resize', handleOrientationChange)
  }, [])

  return orientation
}

/**
 * Utility to check if code is running on mobile device based on user agent
 * Note: This is a client-side check only and should be used with caution
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Utility to check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE specific
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Hook to detect if user prefers reduced motion
 * Useful for accessibility
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Hook to detect if device is in standalone mode (PWA)
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isStandalonePWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore - webkit specific
      window.navigator.standalone === true

    setIsStandalone(isStandalonePWA)
  }, [])

  return isStandalone
}

/**
 * Utility function to get safe area insets for iOS devices
 * Returns CSS custom properties for safe areas
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return {}

  return {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
  }
}

/**
 * Hook to combine multiple responsive conditions
 */
export function useResponsive() {
  const breakpoint = useBreakpoint()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const viewport = useViewport()
  const orientation = useOrientation()
  const isTouch = isTouchDevice()
  const prefersReducedMotion = usePrefersReducedMotion()

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    viewport,
    orientation,
    isTouch,
    prefersReducedMotion,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  }
}
