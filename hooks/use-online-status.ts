'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getNetworkStatus,
  getNetworkInfo,
  pingServer,
  setupNetworkListeners,
  processPendingRequests,
  getPendingRequestsCount,
  type NetworkStatus,
  type NetworkInfo
} from '@/lib/offline-detection'

export interface UseOnlineStatusOptions {
  /**
   * Enable periodic ping to verify actual connectivity
   */
  enablePing?: boolean

  /**
   * Ping interval in milliseconds
   */
  pingInterval?: number

  /**
   * Ping URL
   */
  pingUrl?: string

  /**
   * Callbacks
   */
  onOnline?: () => void
  onOffline?: () => void
  onStatusChange?: (status: NetworkStatus) => void
}

export interface UseOnlineStatusReturn {
  /**
   * Whether the browser reports being online
   */
  isOnline: boolean

  /**
   * Current network status
   */
  status: NetworkStatus

  /**
   * Detailed network information
   */
  networkInfo: NetworkInfo

  /**
   * Whether the app has verified connectivity (via ping)
   */
  isVerified: boolean

  /**
   * Number of pending requests waiting to be synced
   */
  pendingRequestsCount: number

  /**
   * Whether the app is currently syncing
   */
  isSyncing: boolean

  /**
   * Manually trigger a connectivity check
   */
  checkConnectivity: () => Promise<void>

  /**
   * Manually trigger sync of pending requests
   */
  syncPendingRequests: () => Promise<void>
}

/**
 * Hook to detect and monitor online/offline status
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}): UseOnlineStatusReturn {
  const {
    enablePing = true,
    pingInterval = 30000,
    pingUrl = '/api/health',
    onOnline,
    onOffline,
    onStatusChange
  } = options

  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [status, setStatus] = useState<NetworkStatus>('online')
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ isOnline: true })
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Update network status
  const updateNetworkStatus = useCallback(() => {
    const newStatus = getNetworkStatus()
    const newNetworkInfo = getNetworkInfo()
    const newIsOnline = newNetworkInfo.isOnline

    setStatus(newStatus)
    setNetworkInfo(newNetworkInfo)
    setIsOnline(newIsOnline)

    // Call status change callback
    if (onStatusChange) {
      onStatusChange(newStatus)
    }
  }, [onStatusChange])

  // Check connectivity with ping
  const checkConnectivity = useCallback(async () => {
    if (!enablePing) {
      setIsVerified(true)
      return
    }

    try {
      const result = await pingServer(pingUrl)
      setIsVerified(result)

      if (!result && isOnline) {
        // Browser says online but ping failed
        setStatus('offline')
        if (onOffline) {
          onOffline()
        }
      }
    } catch (error) {
      console.error('[useOnlineStatus] Ping failed:', error)
      setIsVerified(false)
    }
  }, [enablePing, pingUrl, isOnline, onOffline])

  // Sync pending requests
  const syncPendingRequests = useCallback(async () => {
    if (!isOnline) {
      console.log('[useOnlineStatus] Cannot sync while offline')
      return
    }

    setIsSyncing(true)

    try {
      await processPendingRequests()
      setPendingRequestsCount(getPendingRequestsCount())
    } catch (error) {
      console.error('[useOnlineStatus] Failed to sync pending requests:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  // Setup network event listeners
  useEffect(() => {
    // Initial status
    updateNetworkStatus()
    checkConnectivity()
    setPendingRequestsCount(getPendingRequestsCount())

    // Setup listeners
    const cleanup = setupNetworkListeners(
      () => {
        updateNetworkStatus()
        checkConnectivity()
        if (onOnline) {
          onOnline()
        }
        // Auto-sync when coming online
        syncPendingRequests()
      },
      () => {
        updateNetworkStatus()
        setIsVerified(false)
        if (onOffline) {
          onOffline()
        }
      }
    )

    return cleanup
  }, [updateNetworkStatus, checkConnectivity, syncPendingRequests, onOnline, onOffline])

  // Setup periodic ping
  useEffect(() => {
    if (!enablePing || !isOnline) {
      return
    }

    const intervalId = setInterval(() => {
      checkConnectivity()
    }, pingInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enablePing, isOnline, pingInterval, checkConnectivity])

  // Update pending requests count periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPendingRequestsCount(getPendingRequestsCount())
    }, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return {
    isOnline,
    status,
    networkInfo,
    isVerified,
    pendingRequestsCount,
    isSyncing,
    checkConnectivity,
    syncPendingRequests
  }
}

/**
 * Simple hook that just returns online/offline status
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook to check if connection is fast
 */
export function useIsFastConnection(): boolean {
  const { networkInfo } = useOnlineStatus({ enablePing: false })
  const [isFast, setIsFast] = useState<boolean>(true)

  useEffect(() => {
    const effectiveType = networkInfo.effectiveType

    if (!effectiveType) {
      setIsFast(true)
      return
    }

    setIsFast(effectiveType === '4g' || effectiveType === '3g')
  }, [networkInfo])

  return isFast
}
