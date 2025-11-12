/**
 * Offline Detection Utilities
 * Provides utilities for detecting online/offline status and managing offline requests
 */

export type NetworkStatus = 'online' | 'offline' | 'slow'

export interface PendingRequest {
  id: string
  url: string
  method: string
  body?: any
  headers?: Record<string, string>
  timestamp: number
  retryCount: number
}

export interface NetworkInfo {
  isOnline: boolean
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkStatus {
  if (typeof window === 'undefined') return 'online'

  if (!navigator.onLine) {
    return 'offline'
  }

  // Check connection quality if available
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (connection) {
    const effectiveType = connection.effectiveType

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'slow'
    }
  }

  return 'online'
}

/**
 * Get detailed network information
 */
export function getNetworkInfo(): NetworkInfo {
  if (typeof window === 'undefined') {
    return { isOnline: true }
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  return {
    isOnline: navigator.onLine,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData
  }
}

/**
 * Check if connection is fast enough for specific operations
 */
export function isFastConnection(): boolean {
  if (typeof window === 'undefined') return true

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!connection) return true

  const effectiveType = connection.effectiveType

  // Consider 3g and above as fast
  return effectiveType === '4g' || effectiveType === '3g'
}

/**
 * Ping server to check actual connectivity
 */
export async function pingServer(url: string = '/api/health', timeout: number = 5000): Promise<boolean> {
  if (typeof window === 'undefined') return true

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.error('[Offline Detection] Ping failed:', error)
    return false
  }
}

/**
 * Queue manager for pending requests
 */
class RequestQueueManager {
  private static instance: RequestQueueManager
  private queue: PendingRequest[] = []
  private storageKey = 'caris-pending-requests'
  private maxRetries = 3
  private retryDelay = 1000

  private constructor() {
    this.loadQueue()
  }

  static getInstance(): RequestQueueManager {
    if (!RequestQueueManager.instance) {
      RequestQueueManager.instance = new RequestQueueManager()
    }
    return RequestQueueManager.instance
  }

  /**
   * Add request to queue
   */
  add(request: Omit<PendingRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    const pendingRequest: PendingRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    }

    this.queue.push(pendingRequest)
    this.saveQueue()

    console.log('[Request Queue] Added request:', pendingRequest.id)
  }

  /**
   * Get all pending requests
   */
  getAll(): PendingRequest[] {
    return [...this.queue]
  }

  /**
   * Remove request from queue
   */
  remove(id: string): void {
    this.queue = this.queue.filter(req => req.id !== id)
    this.saveQueue()

    console.log('[Request Queue] Removed request:', id)
  }

  /**
   * Clear all requests
   */
  clear(): void {
    this.queue = []
    this.saveQueue()

    console.log('[Request Queue] Cleared all requests')
  }

  /**
   * Process pending requests
   */
  async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      console.log('[Request Queue] No pending requests')
      return
    }

    console.log('[Request Queue] Processing', this.queue.length, 'requests')

    const requests = [...this.queue]

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers
          },
          body: request.body ? JSON.stringify(request.body) : undefined
        })

        if (response.ok) {
          console.log('[Request Queue] Request succeeded:', request.id)
          this.remove(request.id)
        } else if (response.status >= 400 && response.status < 500) {
          // Client error, don't retry
          console.error('[Request Queue] Request failed with client error:', request.id)
          this.remove(request.id)
        } else {
          // Server error, retry
          await this.handleFailedRequest(request)
        }
      } catch (error) {
        console.error('[Request Queue] Request failed:', request.id, error)
        await this.handleFailedRequest(request)
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, this.retryDelay))
    }
  }

  /**
   * Handle failed request
   */
  private async handleFailedRequest(request: PendingRequest): Promise<void> {
    request.retryCount++

    if (request.retryCount >= this.maxRetries) {
      console.error('[Request Queue] Max retries reached for request:', request.id)
      this.remove(request.id)
    } else {
      console.log('[Request Queue] Retrying request:', request.id, 'Attempt:', request.retryCount)
      this.saveQueue()
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        this.queue = JSON.parse(saved)
        console.log('[Request Queue] Loaded', this.queue.length, 'pending requests')
      }
    } catch (error) {
      console.error('[Request Queue] Failed to load queue:', error)
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue))
    } catch (error) {
      console.error('[Request Queue] Failed to save queue:', error)
    }
  }
}

/**
 * Get request queue instance
 */
export function getRequestQueue(): RequestQueueManager {
  return RequestQueueManager.getInstance()
}

/**
 * Add request to queue
 */
export function queueRequest(
  url: string,
  method: string = 'POST',
  body?: any,
  headers?: Record<string, string>
): void {
  const queue = getRequestQueue()
  queue.add({ url, method, body, headers })
}

/**
 * Process pending requests
 */
export async function processPendingRequests(): Promise<void> {
  const queue = getRequestQueue()
  await queue.processQueue()
}

/**
 * Clear pending requests
 */
export function clearPendingRequests(): void {
  const queue = getRequestQueue()
  queue.clear()
}

/**
 * Get pending requests count
 */
export function getPendingRequestsCount(): number {
  const queue = getRequestQueue()
  return queue.getAll().length
}

/**
 * Setup online/offline event listeners
 */
export function setupNetworkListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => {
    console.log('[Offline Detection] Network online')
    onOnline?.()

    // Process pending requests
    processPendingRequests()
  }

  const handleOffline = () => {
    console.log('[Offline Detection] Network offline')
    onOffline?.()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Also listen for connection change
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (connection) {
    connection.addEventListener('change', () => {
      console.log('[Offline Detection] Connection changed:', getNetworkInfo())
    })
  }

  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
