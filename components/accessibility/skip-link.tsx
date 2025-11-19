/**
 * Skip Link Component
 *
 * Provides a "Skip to main content" link for keyboard users.
 * This is required by WCAG 2.1 Level A (2.4.1 Bypass Blocks).
 *
 * The link is visually hidden but becomes visible when focused,
 * allowing keyboard users to quickly jump to main content without
 * tabbing through navigation.
 *
 * Usage:
 * 1. Add <SkipLink /> at the very top of your layout
 * 2. Ensure main content has id="main-content"
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
 */

"use client"

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-[9999]
        focus:px-4
        focus:py-2
        focus:bg-primary
        focus:text-primary-foreground
        focus:rounded-md
        focus:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-ring
        focus:ring-offset-2
        transition-all
      "
    >
      Skip to main content
    </a>
  )
}

/**
 * Portuguese version
 */
export function SkipLinkPT() {
  return (
    <a
      href="#main-content"
      className="
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-[9999]
        focus:px-4
        focus:py-2
        focus:bg-primary
        focus:text-primary-foreground
        focus:rounded-md
        focus:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-ring
        focus:ring-offset-2
        transition-all
      "
    >
      Pular para o conteúdo principal
    </a>
  )
}

export default SkipLink
