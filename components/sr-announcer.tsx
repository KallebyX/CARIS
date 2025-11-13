/**
 * Screen Reader Announcer Component
 * Provides live region announcements for dynamic content changes
 * WCAG 2.1 Level AA Compliant
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Live region politeness levels
 */
export type Politeness = 'polite' | 'assertive' | 'off'

/**
 * Announcement queue item
 */
interface Announcement {
  id: string
  message: string
  politeness: Politeness
  timestamp: number
}

/**
 * Screen Reader Announcer Context
 */
interface AnnouncerContextValue {
  announce: (message: string, politeness?: Politeness) => void
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
}

const AnnouncerContext = React.createContext<AnnouncerContextValue | undefined>(undefined)

/**
 * Hook to use the announcer
 */
export function useAnnouncer(): AnnouncerContextValue {
  const context = React.useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within AnnouncerProvider')
  }
  return context
}

/**
 * Screen Reader Announcer Provider
 * Place this near the root of your app
 */
export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [politeAnnouncements, setPoliteAnnouncements] = React.useState<Announcement[]>([])
  const [assertiveAnnouncements, setAssertiveAnnouncements] = React.useState<Announcement[]>([])

  const announce = React.useCallback((message: string, politeness: Politeness = 'polite') => {
    if (!message || politeness === 'off') return

    const announcement: Announcement = {
      id: `announcement-${Date.now()}-${Math.random()}`,
      message,
      politeness,
      timestamp: Date.now()
    }

    if (politeness === 'polite') {
      setPoliteAnnouncements(prev => [...prev, announcement])
    } else if (politeness === 'assertive') {
      setAssertiveAnnouncements(prev => [...prev, announcement])
    }

    // Clear announcement after it's been read (5 seconds)
    setTimeout(() => {
      if (politeness === 'polite') {
        setPoliteAnnouncements(prev => prev.filter(a => a.id !== announcement.id))
      } else {
        setAssertiveAnnouncements(prev => prev.filter(a => a.id !== announcement.id))
      }
    }, 5000)
  }, [])

  const announcePolite = React.useCallback(
    (message: string) => announce(message, 'polite'),
    [announce]
  )

  const announceAssertive = React.useCallback(
    (message: string) => announce(message, 'assertive'),
    [announce]
  )

  const contextValue: AnnouncerContextValue = {
    announce,
    announcePolite,
    announceAssertive
  }

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}
      <LiveRegion politeness="polite" announcements={politeAnnouncements} />
      <LiveRegion politeness="assertive" announcements={assertiveAnnouncements} />
    </AnnouncerContext.Provider>
  )
}

/**
 * Live region component
 */
function LiveRegion({
  politeness,
  announcements
}: {
  politeness: Politeness
  announcements: Announcement[]
}) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcements.map(announcement => (
        <div key={announcement.id}>{announcement.message}</div>
      ))}
    </div>
  )
}

/**
 * Status announcer for loading states
 */
interface StatusAnnouncerProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  messages?: {
    loading?: string
    success?: string
    error?: string
  }
  /**
   * Auto-announce on status change
   */
  autoAnnounce?: boolean
}

export function StatusAnnouncer({
  status,
  messages = {},
  autoAnnounce = true
}: StatusAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevStatusRef = React.useRef<string>('')

  React.useEffect(() => {
    if (!autoAnnounce || status === prevStatusRef.current) return

    const defaultMessages = {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success',
      error: messages.error || 'An error occurred'
    }

    if (status === 'loading' && defaultMessages.loading) {
      announce(defaultMessages.loading, 'polite')
    } else if (status === 'success' && defaultMessages.success) {
      announce(defaultMessages.success, 'polite')
    } else if (status === 'error' && defaultMessages.error) {
      announce(defaultMessages.error, 'assertive')
    }

    prevStatusRef.current = status
  }, [status, messages, autoAnnounce, announce])

  return null
}

/**
 * Notification announcer
 */
interface NotificationAnnouncerProps {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  /**
   * Auto-announce when message changes
   */
  autoAnnounce?: boolean
}

export function NotificationAnnouncer({
  type,
  message,
  autoAnnounce = true
}: NotificationAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevMessageRef = React.useRef<string>('')

  React.useEffect(() => {
    if (!autoAnnounce || message === prevMessageRef.current || !message) return

    const politeness = type === 'error' || type === 'warning' ? 'assertive' : 'polite'
    const prefix = type.charAt(0).toUpperCase() + type.slice(1)

    announce(`${prefix}: ${message}`, politeness)
    prevMessageRef.current = message
  }, [message, type, autoAnnounce, announce])

  return null
}

/**
 * Progress announcer for long-running operations
 */
interface ProgressAnnouncerProps {
  /**
   * Progress percentage (0-100)
   */
  value: number
  /**
   * Announce interval percentage (e.g., 25 means announce at 25%, 50%, 75%, 100%)
   */
  announceInterval?: number
  /**
   * Custom message template. Use {value} for percentage
   */
  messageTemplate?: string
}

export function ProgressAnnouncer({
  value,
  announceInterval = 25,
  messageTemplate = '{value}% complete'
}: ProgressAnnouncerProps) {
  const { announce } = useAnnouncer()
  const lastAnnouncedRef = React.useRef<number>(-1)

  React.useEffect(() => {
    const currentThreshold = Math.floor(value / announceInterval) * announceInterval

    if (currentThreshold !== lastAnnouncedRef.current && value >= currentThreshold) {
      const message = messageTemplate.replace('{value}', currentThreshold.toString())
      announce(message, 'polite')
      lastAnnouncedRef.current = currentThreshold
    }

    // Always announce completion
    if (value >= 100 && lastAnnouncedRef.current !== 100) {
      announce('Operation complete', 'polite')
      lastAnnouncedRef.current = 100
    }
  }, [value, announceInterval, messageTemplate, announce])

  return null
}

/**
 * Chat message announcer for new messages
 */
interface ChatMessageAnnouncerProps {
  /**
   * New message content
   */
  message: string
  /**
   * Sender name
   */
  sender: string
  /**
   * Whether this is from the current user
   */
  isOwnMessage?: boolean
  /**
   * Timestamp
   */
  timestamp?: Date
}

export function ChatMessageAnnouncer({
  message,
  sender,
  isOwnMessage = false,
  timestamp
}: ChatMessageAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevMessageRef = React.useRef<string>('')

  React.useEffect(() => {
    if (message === prevMessageRef.current || !message) return

    // Don't announce own messages (user already knows they sent it)
    if (isOwnMessage) {
      prevMessageRef.current = message
      return
    }

    const time = timestamp ? timestamp.toLocaleTimeString() : ''
    const announcement = time
      ? `New message from ${sender} at ${time}: ${message}`
      : `New message from ${sender}: ${message}`

    announce(announcement, 'polite')
    prevMessageRef.current = message
  }, [message, sender, isOwnMessage, timestamp, announce])

  return null
}

/**
 * Route change announcer
 */
interface RouteAnnouncerProps {
  /**
   * Page title or route name
   */
  title: string
  /**
   * Auto-announce on title change
   */
  autoAnnounce?: boolean
}

export function RouteAnnouncer({ title, autoAnnounce = true }: RouteAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevTitleRef = React.useRef<string>('')

  React.useEffect(() => {
    if (!autoAnnounce || title === prevTitleRef.current || !title) return

    announce(`Navigated to ${title}`, 'polite')
    prevTitleRef.current = title
  }, [title, autoAnnounce, announce])

  return null
}

/**
 * Form validation announcer
 */
interface FormValidationAnnouncerProps {
  /**
   * Number of errors
   */
  errorCount: number
  /**
   * Auto-announce on error count change
   */
  autoAnnounce?: boolean
}

export function FormValidationAnnouncer({
  errorCount,
  autoAnnounce = true
}: FormValidationAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevCountRef = React.useRef<number>(0)

  React.useEffect(() => {
    if (!autoAnnounce || errorCount === prevCountRef.current) return

    if (errorCount > 0) {
      const message =
        errorCount === 1
          ? 'Form has 1 error. Please review and correct.'
          : `Form has ${errorCount} errors. Please review and correct.`
      announce(message, 'assertive')
    } else if (prevCountRef.current > 0 && errorCount === 0) {
      announce('All form errors have been corrected', 'polite')
    }

    prevCountRef.current = errorCount
  }, [errorCount, autoAnnounce, announce])

  return null
}

/**
 * List update announcer for dynamic lists
 */
interface ListUpdateAnnouncerProps {
  /**
   * Number of items in the list
   */
  count: number
  /**
   * Item type (e.g., "messages", "notifications")
   */
  itemType?: string
  /**
   * Auto-announce on count change
   */
  autoAnnounce?: boolean
}

export function ListUpdateAnnouncer({
  count,
  itemType = 'items',
  autoAnnounce = true
}: ListUpdateAnnouncerProps) {
  const { announce } = useAnnouncer()
  const prevCountRef = React.useRef<number>(count)

  React.useEffect(() => {
    if (!autoAnnounce || count === prevCountRef.current) return

    const difference = count - prevCountRef.current

    if (difference > 0) {
      const message =
        difference === 1
          ? `1 new ${itemType.slice(0, -1)} added`
          : `${difference} new ${itemType} added`
      announce(message, 'polite')
    } else if (difference < 0) {
      const message =
        Math.abs(difference) === 1
          ? `1 ${itemType.slice(0, -1)} removed`
          : `${Math.abs(difference)} ${itemType} removed`
      announce(message, 'polite')
    }

    prevCountRef.current = count
  }, [count, itemType, autoAnnounce, announce])

  return null
}

/**
 * Simple live region for one-off announcements
 */
export function LiveRegionAnnouncement({
  message,
  politeness = 'polite',
  className
}: {
  message: string
  politeness?: Politeness
  className?: string
}) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className={cn("sr-only", className)}
    >
      {message}
    </div>
  )
}
