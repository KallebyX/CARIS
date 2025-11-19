/**
 * Visually Hidden Component
 *
 * Hides content visually but keeps it accessible to screen readers.
 * This is the correct way to hide text that should only be read by
 * assistive technologies.
 *
 * DO NOT use display: none or visibility: hidden for screen reader text,
 * as those hide content from screen readers as well.
 *
 * Use Cases:
 * - Icon-only buttons that need accessible labels
 * - Additional context for screen reader users
 * - Skip links
 * - Live region announcements
 *
 * @see https://www.a11yproject.com/posts/how-to-hide-content/
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface VisuallyHiddenProps {
  /** Content to hide visually but keep for screen readers */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** HTML element to render (default: span) */
  as?: 'span' | 'div' | 'p' | 'label'
}

/**
 * Hides content visually while keeping it accessible to screen readers
 *
 * @example
 * // Add accessible label to icon-only button
 * <button>
 *   <TrashIcon />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 *
 * @example
 * // Add context for screen readers
 * <a href="/profile">
 *   <Avatar />
 *   <VisuallyHidden>View profile</VisuallyHidden>
 * </a>
 *
 * @example
 * // Custom element
 * <VisuallyHidden as="label" htmlFor="search">
 *   Search
 * </VisuallyHidden>
 * <input id="search" type="search" placeholder="Search..." />
 */
export function VisuallyHidden({
  children,
  className,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  return (
    <Component className={cn('sr-only', className)}>
      {children}
    </Component>
  )
}

/**
 * Makes content visible on focus (useful for skip links)
 *
 * @example
 * <FocusVisible>
 *   <a href="#main">Skip to content</a>
 * </FocusVisible>
 */
export function FocusVisible({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('sr-only focus-within:not-sr-only', className)}>
      {children}
    </div>
  )
}

/**
 * Utility function to check if an element needs accessible text
 * Used in development to catch accessibility issues
 */
export function hasAccessibleText(element: HTMLElement): boolean {
  // Check for text content
  if (element.textContent?.trim()) return true

  // Check for aria-label
  if (element.getAttribute('aria-label')) return true

  // Check for aria-labelledby
  if (element.getAttribute('aria-labelledby')) return true

  // Check for title attribute (though not recommended)
  if (element.getAttribute('title')) return true

  // Check for alt attribute (images)
  if (element.tagName === 'IMG' && element.getAttribute('alt')) return true

  return false
}

/**
 * Development helper to warn about missing accessible text
 * Only runs in development mode
 */
export function warnIfNoAccessibleText(
  element: HTMLElement | null,
  componentName: string
) {
  if (process.env.NODE_ENV === 'development' && element) {
    if (!hasAccessibleText(element)) {
      console.warn(
        `[Accessibility Warning] ${componentName} may be missing accessible text.`,
        'Consider adding aria-label, aria-labelledby, or visible text.',
        element
      )
    }
  }
}

export default VisuallyHidden
