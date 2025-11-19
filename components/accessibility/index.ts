/**
 * Accessibility Components and Utilities
 *
 * This module exports accessibility-focused components and utilities
 * to help maintain WCAG 2.1 Level AA compliance.
 *
 * @see docs/ACCESSIBILITY_AUDIT.md for full audit and guidelines
 */

// Skip link for keyboard navigation
export { SkipLink, SkipLinkPT } from './skip-link'

// Screen reader announcements
export {
  LiveAnnouncer,
  LoadingAnnouncer,
  useAnnounce,
} from './live-announcer'

// Visually hidden content
export {
  VisuallyHidden,
  FocusVisible,
  hasAccessibleText,
  warnIfNoAccessibleText,
} from './visually-hidden'

// Re-export types
export type { default as LiveAnnouncerProps } from './live-announcer'
export type { default as VisuallyHiddenProps } from './visually-hidden'
