/**
 * Live Announcer Component
 *
 * Announces dynamic content changes to screen readers using ARIA live regions.
 * This is required by WCAG 2.1 Level AA (4.1.3 Status Messages).
 *
 * Use Cases:
 * - Form submission success/error messages
 * - Loading states
 * - Data updates
 * - Notification messages
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
 */

"use client"

import { useEffect, useRef } from 'react'

interface LiveAnnouncerProps {
  /** Message to announce to screen readers */
  message: string
  /** Politeness level - 'polite' waits for pause, 'assertive' interrupts */
  priority?: 'polite' | 'assertive'
  /** Whether to announce the entire region or just changes */
  atomic?: boolean
  /** Clear message after delay (ms) to allow re-announcement of same message */
  clearAfter?: number
}

/**
 * Live region that announces messages to screen readers
 *
 * @example
 * // Polite announcement (waits for pause in speech)
 * <LiveAnnouncer message="Form submitted successfully" />
 *
 * @example
 * // Assertive announcement (interrupts current speech)
 * <LiveAnnouncer
 *   message="Error: Please check your input"
 *   priority="assertive"
 * />
 *
 * @example
 * // Clear after 3 seconds to allow same message again
 * <LiveAnnouncer
 *   message={statusMessage}
 *   clearAfter={3000}
 * />
 */
export function LiveAnnouncer({
  message,
  priority = 'polite',
  atomic = true,
  clearAfter,
}: LiveAnnouncerProps) {
  const announceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (announceRef.current && message) {
      // Update message
      announceRef.current.textContent = message

      // Clear after delay if specified
      if (clearAfter) {
        const timeout = setTimeout(() => {
          if (announceRef.current) {
            announceRef.current.textContent = ''
          }
        }, clearAfter)

        return () => clearTimeout(timeout)
      }
    }
  }, [message, clearAfter])

  if (!message) return null

  return (
    <div
      ref={announceRef}
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {message}
    </div>
  )
}

/**
 * Hook for programmatic announcements
 *
 * @example
 * const announce = useAnnounce()
 *
 * function handleSubmit() {
 *   try {
 *     await submitForm()
 *     announce('Form submitted successfully', 'polite')
 *   } catch (error) {
 *     announce('Error submitting form', 'assertive')
 *   }
 * }
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create live region on mount
    const div = document.createElement('div')
    div.setAttribute('role', 'status')
    div.setAttribute('aria-live', 'polite')
    div.setAttribute('aria-atomic', 'true')
    div.className = 'sr-only'
    document.body.appendChild(div)
    announceRef.current = div

    return () => {
      // Cleanup on unmount
      if (announceRef.current) {
        document.body.removeChild(announceRef.current)
      }
    }
  }, [])

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority)
      announceRef.current.textContent = message

      // Clear after 1 second to allow same message to be announced again
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = ''
        }
      }, 1000)
    }
  }

  return announce
}

/**
 * Loading state announcer
 *
 * @example
 * <LoadingAnnouncer
 *   loading={isLoading}
 *   loadingMessage="Loading data..."
 *   completeMessage="Data loaded successfully"
 * />
 */
export function LoadingAnnouncer({
  loading,
  loadingMessage = 'Loading...',
  completeMessage = 'Content loaded',
}: {
  loading: boolean
  loadingMessage?: string
  completeMessage?: string
}) {
  const message = loading ? loadingMessage : completeMessage

  return (
    <LiveAnnouncer
      message={message}
      priority="polite"
      clearAfter={2000}
    />
  )
}

export default LiveAnnouncer
