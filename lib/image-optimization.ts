/**
 * Image Optimization Utilities for CÁRIS Platform
 *
 * Provides helpers for Next.js Image optimization including:
 * - Responsive image sizes
 * - Blur placeholders
 * - Cloudflare R2 / AWS S3 integration
 * - Image format selection (WebP, AVIF)
 * - Lazy loading strategies
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/images
 */

import type { ImageProps } from 'next/image'

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface OptimizedImageProps extends Partial<ImageProps> {
  src: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
}

export interface ImageDimensions {
  width: number
  height: number
}

export interface ResponsiveSizes {
  mobile: string
  tablet: string
  desktop: string
  wide: string
}

// ================================================================
// IMAGE DOMAINS & CDN CONFIGURATION
// ================================================================

/**
 * Allowed image domains and patterns
 * These should be configured in next.config.js as well
 */
export const IMAGE_DOMAINS = {
  // External image providers
  cloudflare: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_DOMAIN || '',
  aws: process.env.NEXT_PUBLIC_AWS_S3_DOMAIN || '',
  avatars: 'avatars.githubusercontent.com',
  unsplash: 'images.unsplash.com',
  placeholder: 'via.placeholder.com',

  // Internal domains
  local: 'localhost',
} as const

/**
 * CDN URL builder
 * Constructs optimized CDN URLs for images
 */
export function buildCDNUrl(
  path: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
  } = {}
): string {
  const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || IMAGE_DOMAINS.cloudflare

  if (!cdnBase) {
    return path // Return original if no CDN configured
  }

  // Build query parameters for image transformations
  const params = new URLSearchParams()

  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)

  const queryString = params.toString()
  const separator = path.includes('?') ? '&' : '?'

  return `${cdnBase}${path}${queryString ? separator + queryString : ''}`
}

// ================================================================
// RESPONSIVE IMAGE SIZES
// ================================================================

/**
 * Standard responsive sizes for different breakpoints
 * Follows Tailwind CSS breakpoints
 */
export const RESPONSIVE_SIZES: ResponsiveSizes = {
  mobile: '(max-width: 640px) 100vw',
  tablet: '(max-width: 768px) 50vw',
  desktop: '(max-width: 1024px) 33vw',
  wide: '25vw',
}

/**
 * Generate responsive sizes string
 * Used in Next.js Image component's sizes prop
 *
 * @example
 * ```tsx
 * <Image
 *   src="/image.jpg"
 *   alt="..."
 *   sizes={generateSizes({ mobile: '100vw', tablet: '50vw', desktop: '33vw' })}
 * />
 * ```
 */
export function generateSizes(config: Partial<ResponsiveSizes>): string {
  const sizes: string[] = []

  if (config.mobile) sizes.push(`(max-width: 640px) ${config.mobile}`)
  if (config.tablet) sizes.push(`(max-width: 768px) ${config.tablet}`)
  if (config.desktop) sizes.push(`(max-width: 1024px) ${config.desktop}`)
  if (config.wide) sizes.push(config.wide)

  return sizes.join(', ')
}

/**
 * Preset responsive sizes for common use cases
 */
export const ResponsivePresets = {
  /**
   * Full width on all devices
   */
  FULL_WIDTH: generateSizes({
    mobile: '100vw',
    tablet: '100vw',
    desktop: '100vw',
    wide: '100vw',
  }),

  /**
   * Two columns on tablet+, full width on mobile
   */
  TWO_COLUMN: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '50vw',
    wide: '50vw',
  }),

  /**
   * Three columns on desktop+, two on tablet, full on mobile
   */
  THREE_COLUMN: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    wide: '33vw',
  }),

  /**
   * Four columns on wide, three on desktop, two on tablet, full on mobile
   */
  FOUR_COLUMN: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    wide: '25vw',
  }),

  /**
   * Avatar sizes (small fixed width)
   */
  AVATAR: '(max-width: 640px) 48px, 64px',

  /**
   * Hero image (large, full width)
   */
  HERO: generateSizes({
    mobile: '100vw',
    tablet: '100vw',
    desktop: '100vw',
    wide: '1920px',
  }),

  /**
   * Card thumbnail
   */
  CARD: generateSizes({
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    wide: '300px',
  }),

  /**
   * Sidebar image
   */
  SIDEBAR: '(max-width: 1024px) 100vw, 300px',
}

// ================================================================
// BLUR PLACEHOLDER GENERATION
// ================================================================

/**
 * Generate a simple blur data URL
 * Creates a tiny base64-encoded image for blur placeholder
 *
 * @param width - Placeholder width (smaller = smaller file size)
 * @param height - Placeholder height
 * @param color - Hex color code
 * @returns Base64 data URL
 */
export function generateBlurDataURL(
  width: number = 10,
  height: number = 10,
  color: string = '#e5e7eb'
): string {
  // Create a minimal SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>
  `

  // Convert to base64
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Generate gradient blur placeholder
 * Creates a gradient effect for more visually appealing placeholders
 */
export function generateGradientBlur(
  startColor: string = '#e5e7eb',
  endColor: string = '#f3f4f6',
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal'
): string {
  const gradients = {
    horizontal: `x1="0%" y1="0%" x2="100%" y2="0%"`,
    vertical: `x1="0%" y1="0%" x2="0%" y2="100%"`,
    diagonal: `x1="0%" y1="0%" x2="100%" y2="100%"`,
  }

  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" ${gradients[direction]}>
          <stop offset="0%" stop-color="${startColor}"/>
          <stop offset="100%" stop-color="${endColor}"/>
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill="url(#grad)"/>
    </svg>
  `

  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Preset blur placeholders for common use cases
 */
export const BlurPlaceholders = {
  LIGHT: generateBlurDataURL(10, 10, '#f3f4f6'),
  GRAY: generateBlurDataURL(10, 10, '#e5e7eb'),
  DARK: generateBlurDataURL(10, 10, '#1f2937'),
  BLUE: generateBlurDataURL(10, 10, '#dbeafe'),
  GREEN: generateBlurDataURL(10, 10, '#d1fae5'),
  PURPLE: generateBlurDataURL(10, 10, '#e9d5ff'),
  GRADIENT: generateGradientBlur('#e5e7eb', '#f3f4f6', 'diagonal'),
}

// ================================================================
// ASPECT RATIO UTILITIES
// ================================================================

/**
 * Calculate dimensions from aspect ratio
 *
 * @param aspectRatio - Aspect ratio string (e.g., '16/9', '4:3')
 * @param baseWidth - Base width to calculate height from
 * @returns Calculated dimensions
 */
export function calculateAspectRatio(
  aspectRatio: string,
  baseWidth: number
): ImageDimensions {
  const [widthRatio, heightRatio] = aspectRatio
    .split(/[/:x]/)
    .map((n) => parseFloat(n))

  const height = Math.round((baseWidth * heightRatio) / widthRatio)

  return { width: baseWidth, height }
}

/**
 * Common aspect ratios
 */
export const AspectRatios = {
  SQUARE: '1/1',
  PORTRAIT: '3/4',
  LANDSCAPE: '4/3',
  WIDESCREEN: '16/9',
  ULTRAWIDE: '21/9',
  CINEMA: '2.39/1',
  PHOTO: '3/2',
}

// ================================================================
// IMAGE OPTIMIZATION HELPER
// ================================================================

/**
 * Generate optimized image props for Next.js Image component
 *
 * @example
 * ```tsx
 * import Image from 'next/image'
 * import { getOptimizedImageProps } from '@/lib/image-optimization'
 *
 * export function Avatar({ src, alt }) {
 *   const imageProps = getOptimizedImageProps({
 *     src,
 *     alt,
 *     width: 64,
 *     height: 64,
 *     aspectRatio: '1/1'
 *   })
 *
 *   return <Image {...imageProps} />
 * }
 * ```
 */
export function getOptimizedImageProps(
  options: OptimizedImageProps
): ImageProps {
  const {
    src,
    alt,
    width,
    height,
    aspectRatio,
    priority = false,
    quality = 85,
    placeholder = 'blur',
    blurDataURL,
    sizes,
    ...rest
  } = options

  // Calculate dimensions if aspect ratio provided
  let finalWidth = width
  let finalHeight = height

  if (aspectRatio && width && !height) {
    const dimensions = calculateAspectRatio(aspectRatio, width)
    finalHeight = dimensions.height
  }

  // Generate blur placeholder if needed
  const finalBlurDataURL =
    placeholder === 'blur'
      ? blurDataURL || BlurPlaceholders.GRAY
      : undefined

  // Base props
  const imageProps: ImageProps = {
    src,
    alt,
    quality,
    priority,
    ...rest,
  }

  // Add dimensions if provided
  if (finalWidth) imageProps.width = finalWidth
  if (finalHeight) imageProps.height = finalHeight

  // Add placeholder
  if (placeholder === 'blur' && finalBlurDataURL) {
    imageProps.placeholder = 'blur'
    imageProps.blurDataURL = finalBlurDataURL
  }

  // Add sizes for responsive images
  if (sizes) {
    imageProps.sizes = sizes
  } else if (!priority && (!finalWidth || finalWidth > 400)) {
    // Auto-generate responsive sizes for large images
    imageProps.sizes = ResponsivePresets.FOUR_COLUMN
  }

  return imageProps
}

// ================================================================
// PRESET CONFIGURATIONS
// ================================================================

/**
 * Preset image configurations for common use cases
 */
export const ImagePresets = {
  /**
   * User avatar (small, square)
   */
  AVATAR: (src: string, alt: string = 'Avatar'): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 64,
      height: 64,
      aspectRatio: AspectRatios.SQUARE,
      sizes: ResponsivePresets.AVATAR,
      blurDataURL: BlurPlaceholders.GRAY,
    }),

  /**
   * Large user avatar (profile page)
   */
  AVATAR_LARGE: (src: string, alt: string = 'Avatar'): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 128,
      height: 128,
      aspectRatio: AspectRatios.SQUARE,
      sizes: '128px',
      blurDataURL: BlurPlaceholders.GRAY,
    }),

  /**
   * Hero image (full width, high quality)
   */
  HERO: (src: string, alt: string): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 1920,
      height: 1080,
      priority: true,
      quality: 90,
      sizes: ResponsivePresets.HERO,
      blurDataURL: BlurPlaceholders.GRADIENT,
    }),

  /**
   * Card thumbnail
   */
  CARD: (src: string, alt: string): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 400,
      height: 300,
      sizes: ResponsivePresets.CARD,
      blurDataURL: BlurPlaceholders.GRAY,
    }),

  /**
   * Blog post image
   */
  BLOG: (src: string, alt: string): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 1200,
      height: 630,
      sizes: ResponsivePresets.FULL_WIDTH,
      blurDataURL: BlurPlaceholders.GRADIENT,
    }),

  /**
   * Meditation thumbnail
   */
  MEDITATION: (src: string, alt: string): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 300,
      height: 300,
      aspectRatio: AspectRatios.SQUARE,
      sizes: ResponsivePresets.THREE_COLUMN,
      blurDataURL: BlurPlaceholders.PURPLE,
    }),

  /**
   * Gallery image
   */
  GALLERY: (src: string, alt: string): ImageProps =>
    getOptimizedImageProps({
      src,
      alt,
      width: 600,
      height: 600,
      sizes: ResponsivePresets.THREE_COLUMN,
      blurDataURL: BlurPlaceholders.GRAY,
    }),
}

// ================================================================
// IMAGE LOADING STRATEGIES
// ================================================================

/**
 * Determine if image should be loaded with priority
 * Priority images are loaded immediately and not lazy-loaded
 *
 * @param position - Position in viewport (fold)
 * @param importance - User-defined importance
 */
export function shouldUsePriority(
  position: 'above-fold' | 'below-fold',
  importance: 'high' | 'normal' | 'low' = 'normal'
): boolean {
  return position === 'above-fold' || importance === 'high'
}

/**
 * Get loading strategy based on context
 */
export function getLoadingStrategy(context: {
  isAboveFold?: boolean
  isHero?: boolean
  isAvatar?: boolean
  isBackground?: boolean
}): {
  priority: boolean
  loading: 'eager' | 'lazy'
} {
  const { isAboveFold = false, isHero = false, isAvatar = false } = context

  // Hero images and above-fold content should load immediately
  if (isHero || isAboveFold) {
    return { priority: true, loading: 'eager' }
  }

  // Avatars are usually small and can be lazy loaded
  if (isAvatar) {
    return { priority: false, loading: 'lazy' }
  }

  // Default: lazy loading
  return { priority: false, loading: 'lazy' }
}

// ================================================================
// IMAGE FORMAT SELECTION
// ================================================================

/**
 * Get optimal image format based on browser support
 * Next.js handles this automatically, but useful for manual optimization
 */
export function getOptimalFormat(): 'avif' | 'webp' | 'jpeg' {
  if (typeof window === 'undefined') {
    return 'webp' // Default for SSR
  }

  // Check AVIF support
  const avifCanvas = document.createElement('canvas')
  if (avifCanvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif'
  }

  // Check WebP support
  const webpCanvas = document.createElement('canvas')
  if (webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp'
  }

  // Fallback to JPEG
  return 'jpeg'
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Check if URL is external
 */
export function isExternalImage(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://')
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get image file extension
 */
export function getImageExtension(src: string): string {
  const url = new URL(src, 'https://example.com') // Handle relative URLs
  const pathname = url.pathname
  const extension = pathname.split('.').pop()?.toLowerCase()
  return extension || ''
}

/**
 * Check if image format is supported by Next.js Image
 */
export function isSupportedFormat(src: string): boolean {
  const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg']
  const extension = getImageExtension(src)
  return supportedFormats.includes(extension)
}
