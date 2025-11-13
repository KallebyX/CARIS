/**
 * Message expiration utilities for client-side use
 * Pure functions without database dependencies
 */

export interface ExpirationSettings {
  duration: number // in milliseconds
  deleteFiles: boolean
  secureWipe: boolean
}

// Predefined expiration options
export const EXPIRATION_OPTIONS = {
  '5min': { duration: 5 * 60 * 1000, label: '5 minutos' },
  '1hour': { duration: 60 * 60 * 1000, label: '1 hora' },
  '24hours': { duration: 24 * 60 * 60 * 1000, label: '24 horas' },
  '7days': { duration: 7 * 24 * 60 * 60 * 1000, label: '7 dias' },
  '30days': { duration: 30 * 24 * 60 * 60 * 1000, label: '30 dias' },
} as const

/**
 * Get expiration status for a message (client-safe utility)
 */
export function getExpirationStatus(expiresAt: Date | null): {
  isExpired: boolean
  timeRemaining: number | null
  timeRemainingText: string | null
} {
  if (!expiresAt) {
    return {
      isExpired: false,
      timeRemaining: null,
      timeRemainingText: null
    }
  }

  const now = Date.now()
  const expirationTime = expiresAt.getTime()
  const timeRemaining = expirationTime - now

  if (timeRemaining <= 0) {
    return {
      isExpired: true,
      timeRemaining: 0,
      timeRemainingText: 'Expirada'
    }
  }

  // Format time remaining
  let timeRemainingText: string

  const minutes = Math.floor(timeRemaining / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    timeRemainingText = `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    timeRemainingText = `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    timeRemainingText = `${minutes}m`
  } else {
    timeRemainingText = '<1m'
  }

  return {
    isExpired: false,
    timeRemaining,
    timeRemainingText
  }
}

/**
 * Calculate expiration date from duration
 */
export function calculateExpirationDate(duration: number): Date {
  return new Date(Date.now() + duration)
}
