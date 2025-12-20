/** @type {import('next').NextConfig} */

// ================================================================
// I18N CONFIGURATION
// ================================================================
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// ================================================================
// SENTRY CONFIGURATION
// ================================================================
const { withSentryConfig } = require("@sentry/nextjs")

// ================================================================
// BUNDLE ANALYZER CONFIGURATION
// ================================================================

// Enable bundle analysis when ANALYZE environment variable is set
// Usage: ANALYZE=true npm run build
let withBundleAnalyzer = (config) => config
try {
  if (process.env.ANALYZE === 'true') {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
      openAnalyzer: true,
    })
  }
} catch (e) {
  console.warn('Bundle analyzer not available. Install @next/bundle-analyzer to use it.')
}

// ================================================================
// NEXT.JS CONFIGURATION
// ================================================================

const nextConfig = {
  // ================================================================
  // EXPERIMENTAL FEATURES
  // ================================================================
  experimental: {
    // Note: esmExternals was removed as it's no longer needed and causes warnings in Next.js 15
    // The default behavior now handles ESM externals correctly

    // Enable optimized package imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'date-fns',
    ],
  },

  // ================================================================
  // ESLINT CONFIG (temporarily ignore during builds for Vercel)
  // TODO: Fix remaining console.log warnings and re-enable
  // ================================================================
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ================================================================
  // TYPESCRIPT CONFIG (temporarily ignore during builds for Vercel)
  // TODO: Fix remaining TS errors in Drizzle query patterns
  // ================================================================
  typescript: {
    ignoreBuildErrors: true,
  },

  // ================================================================
  // TRANSPILE PACKAGES
  // ================================================================
  transpilePackages: [
    '@radix-ui/react-accordion',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-aspect-ratio',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-hover-card',
    '@radix-ui/react-label',
    '@radix-ui/react-menubar',
    '@radix-ui/react-navigation-menu',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-slider',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-toggle',
    '@radix-ui/react-toggle-group',
    '@radix-ui/react-tooltip'
  ],

  // ================================================================
  // IMAGE OPTIMIZATION
  // ================================================================
  images: {
    // Specify allowed image domains and patterns
    remotePatterns: [
      // Cloudflare R2 / CDN
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_DOMAIN || '**.r2.cloudflarestorage.com',
      },
      // AWS S3
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_AWS_S3_DOMAIN || '**.s3.amazonaws.com',
      },
      // Common image providers
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google avatars
      },
      // Fallback - allow all HTTPS (production should be more restrictive)
      {
        protocol: 'https',
        hostname: '**',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],

    // Supported image formats (in order of preference)
    formats: ['image/avif', 'image/webp'],

    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimum cache TTL for optimized images (in seconds)
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year

    // Disable image optimization in development for faster builds
    // unoptimized: process.env.NODE_ENV === 'development',
  },

  // ================================================================
  // ENVIRONMENT VARIABLES
  // ================================================================
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  },

  // ================================================================
  // HEADERS (PWA + Security + Performance)
  // ================================================================
  headers: async () => {
    return [
      // PWA Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // PWA Manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
      // Cache static assets aggressively
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // ================================================================
  // WEBPACK CONFIGURATION
  // ================================================================
  webpack: (config, { isServer, webpack }) => {
    // Client-side: Disable Node.js modules that aren't needed
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false
      }
    }

    // Server-side: Define browser globals that some packages expect
    if (isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'self': 'globalThis',
          'window': 'undefined',
        })
      )
    }

    // Externalize native database modules
    config.externals = [...(config.externals || []), 'pg-native']

    // ================================================================
    // PERFORMANCE OPTIMIZATIONS
    // ================================================================

    // Split chunks for better caching
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for stable dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Group by package name
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1]
              return `npm.${packageName?.replace('@', '')}`
            },
            priority: 10,
          },
          // Separate chunk for React and related libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react-vendor',
            priority: 20,
          },
          // Separate chunk for UI components
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
            name: 'ui-vendor',
            priority: 15,
          },
          // Separate chunk for charting libraries (can be large)
          charts: {
            test: /[\\/]node_modules[\\/](recharts|chart\.js|d3)[\\/]/,
            name: 'charts-vendor',
            priority: 15,
          },
          // Common chunk for shared code
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    }

    // Add bundle size warnings
    config.performance = {
      ...config.performance,
      hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
      maxEntrypointSize: 512000, // 500KB
      maxAssetSize: 512000, // 500KB
    }

    return config
  },

  // ================================================================
  // COMPRESSION
  // ================================================================
  compress: true,

  // ================================================================
  // PRODUCTION OPTIMIZATIONS
  // ================================================================
  productionBrowserSourceMaps: true, // Enable source maps for Sentry (uploaded and removed)

  // ================================================================
  // POWER USER FEATURES
  // ================================================================
  poweredByHeader: false, // Remove X-Powered-By header

  // ================================================================
  // ESLINT
  // ================================================================
  eslint: {
    // ESLint will now run during builds and fail on errors
    // Configured to show warnings for common patterns while catching real issues
    // See .eslintrc.json for rule configuration
    ignoreDuringBuilds: false,
  },

  // ================================================================
  // TYPESCRIPT
  // ================================================================
  typescript: {
    // TypeScript errors will now fail the build
    // This ensures type safety and catches errors during development
    ignoreBuildErrors: false,

    // Enable incremental type checking for better performance
    // tsconfigPath: './tsconfig.json',
  },
}

// ================================================================
// EXPORT CONFIGURATION WITH PLUGINS
// ================================================================

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps to Sentry
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hides source maps from the browser (security)
  hideSourceMaps: true,

  // Automatically annotate React components for better stack traces
  reactComponentAnnotation: {
    enabled: true,
  },

  // Automatically instrument Next.js data fetching methods
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Organization and project from environment variables
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token from environment variables
  authToken: process.env.SENTRY_AUTH_TOKEN,
}

// Wrap with plugins in order: next-intl -> bundle analyzer -> Sentry
let configWithPlugins = withNextIntl(nextConfig)
configWithPlugins = withBundleAnalyzer(configWithPlugins)

// Only wrap with Sentry if DSN is configured
// Enabled when SENTRY_DSN environment variable is set (production/staging)
const shouldUseSentry = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

module.exports = shouldUseSentry
  ? withSentryConfig(configWithPlugins, sentryWebpackPluginOptions)
  : configWithPlugins
