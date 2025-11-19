/**
 * MEDIUM-08: Calendar Integration Error Handling
 *
 * Automatic token refresh for expired OAuth tokens
 * Prevents sync failures due to expired credentials
 */

import { db } from '@/db'
import { userSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { safeError } from '@/lib/safe-logger'
import { retryWithBackoff, TOKEN_REFRESH_RETRY_CONFIG } from './retry-handler'

export interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  error?: string
}

/**
 * Refresh Google Calendar OAuth token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  userId: number
): Promise<TokenRefreshResult> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return {
      success: false,
      error: 'Google OAuth credentials not configured',
    }
  }

  const refreshFn = async () => {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Google token refresh failed: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error('No access token in response')
    }

    return data
  }

  try {
    const result = await retryWithBackoff(
      refreshFn,
      `Google token refresh for user ${userId}`,
      TOKEN_REFRESH_RETRY_CONFIG
    )

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error?.message || 'Token refresh failed',
      }
    }

    const data = result.data
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000))

    // Save new tokens to database
    await db
      .update(userSettings)
      .set({
        googleCalendarAccessToken: data.access_token,
        // Google may return a new refresh token
        googleCalendarRefreshToken: data.refresh_token || refreshToken,
      })
      .where(eq(userSettings.userId, userId))

    console.log(`[TokenRefresh] Successfully refreshed Google token for user ${userId}`)

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
    }
  } catch (error) {
    safeError('[TokenRefresh]', 'Google token refresh error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Refresh Outlook Calendar OAuth token
 */
export async function refreshOutlookToken(
  refreshToken: string,
  userId: number
): Promise<TokenRefreshResult> {
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    return {
      success: false,
      error: 'Outlook OAuth credentials not configured',
    }
  }

  const refreshFn = async () => {
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
    })

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Outlook token refresh failed: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error('No access token in response')
    }

    return data
  }

  try {
    const result = await retryWithBackoff(
      refreshFn,
      `Outlook token refresh for user ${userId}`,
      TOKEN_REFRESH_RETRY_CONFIG
    )

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error?.message || 'Token refresh failed',
      }
    }

    const data = result.data
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000))

    // Save new tokens to database
    await db
      .update(userSettings)
      .set({
        outlookCalendarAccessToken: data.access_token,
        outlookCalendarRefreshToken: data.refresh_token || refreshToken,
      })
      .where(eq(userSettings.userId, userId))

    console.log(`[TokenRefresh] Successfully refreshed Outlook token for user ${userId}`)

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
    }
  } catch (error) {
    safeError('[TokenRefresh]', 'Outlook token refresh error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Attempt to refresh token and retry operation
 */
export async function refreshTokenAndRetry<T>(
  operation: () => Promise<T>,
  provider: 'google' | 'outlook',
  userId: number,
  refreshToken?: string
): Promise<T> {
  if (!refreshToken) {
    throw new Error(`No refresh token available for ${provider}`)
  }

  console.log(`[TokenRefresh] Attempting to refresh ${provider} token for user ${userId}`)

  const refreshResult = provider === 'google'
    ? await refreshGoogleToken(refreshToken, userId)
    : await refreshOutlookToken(refreshToken, userId)

  if (!refreshResult.success) {
    throw new Error(`Token refresh failed: ${refreshResult.error}`)
  }

  console.log(`[TokenRefresh] Token refreshed, retrying operation for ${provider}`)

  // Retry the original operation
  return await operation()
}

/**
 * Check if token is likely expired (within 5 minutes of expiry)
 */
export function isTokenLikelyExpired(expiresAt?: Date | string | null): boolean {
  if (!expiresAt) return false

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const bufferMs = 5 * 60 * 1000 // 5 minutes buffer

  return Date.now() >= (expiry.getTime() - bufferMs)
}

/**
 * Proactively refresh token if it's close to expiring
 */
export async function proactiveTokenRefresh(
  provider: 'google' | 'outlook',
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt?: Date | string | null
): Promise<boolean> {
  if (!isTokenLikelyExpired(expiresAt)) {
    return false // Token is still valid
  }

  console.log(`[TokenRefresh] Proactively refreshing ${provider} token for user ${userId}`)

  const refreshResult = provider === 'google'
    ? await refreshGoogleToken(refreshToken, userId)
    : await refreshOutlookToken(refreshToken, userId)

  return refreshResult.success
}
