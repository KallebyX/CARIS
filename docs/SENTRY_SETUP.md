# Sentry Setup Guide for CÁRIS SaaS Pro

This guide will walk you through setting up Sentry monitoring for the CÁRIS platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up Sentry, ensure you have:

- A Sentry account ([create one here](https://sentry.io/signup/))
- Access to your deployment platform (Vercel, etc.)
- Node.js 18+ installed
- Project cloned and dependencies installed

---

## Quick Start

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create a new project:
   - **Platform**: Next.js
   - **Project Name**: `caris-saas-pro`
   - **Alert frequency**: Real-time

3. Copy your DSN (it looks like: `https://xxxxx@yyyyy.ingest.sentry.io/zzzzz`)

### 2. Configure Environment Variables

Create/update your `.env.local` file:

```bash
# Sentry Configuration
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Sentry Organization & Project
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=caris-saas-pro

# Sentry Auth Token (for source maps)
SENTRY_AUTH_TOKEN=your_auth_token_here

# Environment
NEXT_PUBLIC_ENVIRONMENT=development
```

### 3. Generate Auth Token

1. In Sentry, go to **Settings** > **Auth Tokens**
2. Click **Create New Token**
3. Configure:
   - **Name**: `CARIS Production Releases`
   - **Scopes**:
     - `project:read`
     - `project:releases`
     - `org:read`
4. Copy the token and add to your environment variables

### 4. Test Locally

```bash
# Install dependencies (already done if you ran npm install)
npm install

# Run development server
npm run dev

# Trigger a test error
# Navigate to http://localhost:3000 and use the app
```

### 5. Deploy to Production

Add the same environment variables to your deployment platform:

**Vercel**:
```bash
# Add via Vercel dashboard or CLI
vercel env add SENTRY_DSN
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_ORG
vercel env add SENTRY_PROJECT
vercel env add SENTRY_AUTH_TOKEN
vercel env add NEXT_PUBLIC_ENVIRONMENT production
```

---

## Detailed Setup

### Step 1: Create Sentry Organization & Project

1. **Create Account**:
   - Go to https://sentry.io/signup/
   - Sign up with your email or GitHub

2. **Create Organization**:
   - Organization name: Your company/project name
   - URL: `your-org.sentry.io`

3. **Create Project**:
   - Platform: **Next.js**
   - Project name: `caris-saas-pro`
   - Default alert settings: **Recommended**

4. **Skip the Wizard**: We've already configured Sentry in the codebase

### Step 2: Configure Source Maps

Source maps allow Sentry to show you the original source code in error stack traces.

1. **Generate Auth Token**:
   - Go to **Settings** > **Auth Tokens**
   - Create new token with scopes: `project:read`, `project:releases`, `org:read`
   - Copy token

2. **Add to Environment**:
   ```bash
   SENTRY_AUTH_TOKEN=your_token_here
   ```

3. **Verify Configuration**:
   - Source maps are automatically uploaded during build
   - Check `next.config.js` for Sentry webpack plugin configuration

### Step 3: Configure Environments

We recommend separate Sentry projects or environments for:

- **Development**: Local development (optional)
- **Staging**: Testing environment
- **Production**: Live production environment

**Environment Configuration**:

```bash
# Development
NEXT_PUBLIC_ENVIRONMENT=development
SENTRY_DSN=  # Leave empty or use separate DSN

# Staging
NEXT_PUBLIC_ENVIRONMENT=staging
SENTRY_DSN=your_staging_dsn

# Production
NEXT_PUBLIC_ENVIRONMENT=production
SENTRY_DSN=your_production_dsn
```

### Step 4: Configure Sampling Rates

Adjust sampling rates in `sentry.client.config.ts` and `sentry.server.config.ts`:

**Development**:
```typescript
sampleRate: 1.0              // 100% of errors
tracesSampleRate: 1.0        // 100% of transactions
replaysSessionSampleRate: 1.0 // 100% of sessions
```

**Production** (recommended):
```typescript
sampleRate: 1.0              // 100% of errors (capture all errors)
tracesSampleRate: 0.1        // 10% of transactions (reduce costs)
replaysSessionSampleRate: 0.1 // 10% of sessions (reduce costs)
replaysOnErrorSampleRate: 1.0 // 100% of error sessions
```

### Step 5: Configure Integrations

#### Slack Integration

1. Go to **Settings** > **Integrations** > **Slack**
2. Add workspace
3. Configure channels:
   ```
   #alerts-critical → Fatal/Critical errors
   #alerts-errors   → All errors
   #alerts-performance → Performance issues
   ```

#### Email Notifications

1. Go to **Settings** > **Notifications**
2. Configure:
   - **Workflow**: Real-time for critical, digest for others
   - **Deploy**: Notify on new releases
   - **Quota**: Alert when approaching limits

#### PagerDuty (Optional)

1. Create PagerDuty account
2. Go to **Settings** > **Integrations** > **PagerDuty**
3. Connect accounts
4. Configure escalation policy for critical alerts

---

## Configuration

### Client Configuration (`sentry.client.config.ts`)

Already configured with:
- ✅ Browser tracing for performance monitoring
- ✅ Session replay for debugging
- ✅ Browser profiling
- ✅ User feedback integration
- ✅ Privacy settings (PII scrubbing)
- ✅ Error filtering (browser extensions, network errors)

### Server Configuration (`sentry.server.config.ts`)

Already configured with:
- ✅ HTTP instrumentation
- ✅ Node profiling
- ✅ Database instrumentation (Prisma, Postgres)
- ✅ Console error capturing
- ✅ PII scrubbing for patient data
- ✅ Uncaught exception handlers

### Next.js Configuration (`next.config.js`)

Already configured with:
- ✅ Sentry webpack plugin
- ✅ Automatic source map upload
- ✅ React component annotation
- ✅ Server function instrumentation
- ✅ Source map hiding in production

---

## Testing

### Test Error Tracking

Create a test error to verify Sentry is working:

**1. Create Test Page** (`app/test-sentry/page.tsx`):

```typescript
"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

export default function TestSentry() {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>

      {/* Test Error */}
      <Button
        onClick={() => {
          throw new Error("Test Error - Sentry Integration")
        }}
      >
        Trigger Error
      </Button>

      {/* Test Captured Exception */}
      <Button
        onClick={() => {
          Sentry.captureException(new Error("Test Captured Exception"))
          setError("Error sent to Sentry!")
        }}
      >
        Capture Exception
      </Button>

      {/* Test Message */}
      <Button
        onClick={() => {
          Sentry.captureMessage("Test message from CARIS", "info")
          setError("Message sent to Sentry!")
        }}
      >
        Send Message
      </Button>

      {error && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
```

**2. Navigate to `/test-sentry`**

**3. Click Buttons** to trigger different event types

**4. Check Sentry Dashboard**:
- Go to **Issues** to see errors
- Go to **Performance** to see transactions
- Events should appear within seconds

### Test Performance Monitoring

**1. Test API Performance**:

```typescript
// app/api/test-performance/route.ts
import { NextResponse } from "next/server"
import { traceApi } from "@/lib/sentry-performance"

export async function GET() {
  return traceApi(
    { endpoint: "/api/test-performance", method: "GET" },
    async (transaction) => {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 100))

      return NextResponse.json({
        message: "Performance test",
        timestamp: Date.now()
      })
    }
  )
}
```

**2. Make Requests**:
```bash
curl http://localhost:3000/api/test-performance
```

**3. Check Sentry**:
- Go to **Performance** tab
- See transaction for `/api/test-performance`

### Test Session Replay

**1. Enable Session Replay**:
- Already enabled in client config
- 10% of sessions recorded in production
- 100% of error sessions recorded

**2. Trigger an Error** while navigating the app

**3. View Replay**:
- Go to Sentry **Issues**
- Click on error
- See **Replay** tab with user session recording

---

## Deployment

### Vercel Deployment

**1. Configure Environment Variables**:

```bash
# Via Vercel Dashboard
# Settings > Environment Variables
SENTRY_DSN=production_dsn
NEXT_PUBLIC_SENTRY_DSN=production_dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=caris-saas-pro
SENTRY_AUTH_TOKEN=your_token
NEXT_PUBLIC_ENVIRONMENT=production
```

**2. Deploy**:

```bash
git push origin main
# Vercel auto-deploys
```

**3. Verify**:
- Source maps uploaded: Check build logs for "Source maps uploaded"
- Errors tracked: Trigger test error in production
- Performance monitored: Check Sentry Performance tab

### Manual Deployment

**1. Build**:

```bash
npm run build
```

**2. Verify Source Maps**:

```bash
# Check .next/static for .map files
ls -la .next/static/chunks/*.map

# Source maps should be uploaded to Sentry
# Check build output for confirmation
```

**3. Start Production Server**:

```bash
npm start
```

### Environment-Specific Configuration

**Development**:
```bash
NEXT_PUBLIC_ENVIRONMENT=development
# Sentry disabled or uses low sampling
```

**Staging**:
```bash
NEXT_PUBLIC_ENVIRONMENT=staging
SENTRY_DSN=staging_dsn
# Full sampling for testing
```

**Production**:
```bash
NEXT_PUBLIC_ENVIRONMENT=production
SENTRY_DSN=production_dsn
# Optimized sampling rates
```

---

## Troubleshooting

### Events Not Appearing in Sentry

**Check**:
1. DSN configured correctly
2. Environment is not "development" (events are not sent in dev by default)
3. Sentry initialization successful (check browser console)
4. No ad blockers blocking Sentry
5. Check browser network tab for Sentry requests

**Solution**:
```typescript
// Add debug logging
console.log('Sentry enabled:', isSentryEnabled())
console.log('Sentry DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN)
```

### Source Maps Not Working

**Check**:
1. `SENTRY_AUTH_TOKEN` configured
2. `productionBrowserSourceMaps: true` in `next.config.js`
3. Sentry webpack plugin enabled
4. Release name matches between build and runtime

**Solution**:
```bash
# Check build logs
npm run build 2>&1 | grep -i sentry

# Should see:
# "Source maps uploaded to Sentry"
```

### Too Many Events (Quota Issues)

**Solution**:
1. Reduce sampling rates in config files
2. Add more error filters in `ignoreErrors`
3. Use `beforeSend` to filter events
4. Upgrade Sentry plan if needed

### Performance Issues

**Check**:
1. Session replay disabled if causing performance problems
2. Sampling rates appropriate for traffic
3. Not tracking too many custom metrics

**Solution**:
```typescript
// Reduce sampling in production
tracesSampleRate: 0.1        // 10%
replaysSessionSampleRate: 0.1 // 10%
```

### Privacy Concerns (PII Leaking)

**Check**:
1. PII scrubbing enabled in `beforeSend`
2. Session replay masking configured
3. Request bodies not captured

**Solution**:
- Already configured in `sentry.*.config.ts`
- Uses `maskAllText: true` for session replay
- Scrubs sensitive fields in `beforeSend`

---

## Best Practices

### 1. Use Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/error-boundary'

export default function MyPage() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

### 2. Add Context to Errors

```typescript
import { setCustomContext, identifyUser } from '@/lib/sentry-helpers'

// Add user context
identifyUser({
  id: user.id,
  role: user.role,
  subscription: user.subscriptionTier
})

// Add custom context
setCustomContext('session', {
  sessionId: session.id,
  sessionType: 'therapy'
})
```

### 3. Use Custom Error Tracking

```typescript
import {
  captureApiError,
  captureDatabaseError,
  capturePaymentError
} from '@/lib/error-tracking'

// Track API errors
try {
  const response = await fetch('/api/data')
} catch (error) {
  captureApiError(error, {
    endpoint: '/api/data',
    method: 'GET',
    statusCode: 500
  })
}
```

### 4. Monitor Performance

```typescript
import { traceApi, traceDatabaseQuery } from '@/lib/sentry-performance'

// Trace API endpoints
export async function GET() {
  return traceApi(
    { endpoint: '/api/users', method: 'GET' },
    async (transaction) => {
      const users = await getUsers()
      return NextResponse.json(users)
    }
  )
}
```

### 5. Use Structured Logging

```typescript
import { logger } from '@/lib/logger'

logger.info('User logged in', {
  userId: user.id,
  method: 'email'
})

logger.error('Payment failed', error, {
  paymentId: payment.id,
  amount: payment.amount
})
```

---

## Additional Resources

- **Sentry Documentation**: https://docs.sentry.io/
- **Next.js Guide**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/
- **Alert Configuration**: See `docs/MONITORING_ALERTS.md`

---

## Support

For help with Sentry setup:

1. Check this guide
2. Review Sentry documentation
3. Check Sentry community forums
4. Contact DevOps team
5. Open support ticket with Sentry (if on paid plan)
