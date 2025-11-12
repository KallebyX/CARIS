/**
 * Keyboard Shortcuts Component
 * Displays keyboard shortcuts and provides keyboard navigation utilities
 * WCAG 2.1 Level AA Compliant
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard, Command } from "lucide-react"

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  keys: string[]
  description: string
  action?: () => void
  category?: string
}

/**
 * Keyboard shortcuts configuration for CÁRIS
 */
export const CARIS_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    keys: ['Alt', 'H'],
    description: 'Go to home/dashboard',
    category: 'Navigation'
  },
  {
    keys: ['Alt', 'C'],
    description: 'Open chat/messages',
    category: 'Navigation'
  },
  {
    keys: ['Alt', 'S'],
    description: 'View sessions',
    category: 'Navigation'
  },
  {
    keys: ['Alt', 'D'],
    description: 'Open diary entries',
    category: 'Navigation'
  },
  {
    keys: ['Alt', 'P'],
    description: 'Go to profile/settings',
    category: 'Navigation'
  },

  // Actions
  {
    keys: ['Ctrl', 'K'],
    description: 'Open command palette / search',
    category: 'Actions'
  },
  {
    keys: ['Ctrl', 'N'],
    description: 'Create new entry/session',
    category: 'Actions'
  },
  {
    keys: ['Ctrl', 'S'],
    description: 'Save current form/entry',
    category: 'Actions'
  },
  {
    keys: ['Escape'],
    description: 'Close dialog/modal',
    category: 'Actions'
  },

  // Chat
  {
    keys: ['Ctrl', 'Enter'],
    description: 'Send message',
    category: 'Chat'
  },
  {
    keys: ['Alt', 'Up'],
    description: 'Navigate to previous message',
    category: 'Chat'
  },
  {
    keys: ['Alt', 'Down'],
    description: 'Navigate to next message',
    category: 'Chat'
  },

  // General
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'General'
  },
  {
    keys: ['Tab'],
    description: 'Move focus forward',
    category: 'General'
  },
  {
    keys: ['Shift', 'Tab'],
    description: 'Move focus backward',
    category: 'General'
  },
  {
    keys: ['Enter'],
    description: 'Activate focused element',
    category: 'General'
  },
  {
    keys: ['Space'],
    description: 'Toggle/select focused element',
    category: 'General'
  },

  // Accessibility
  {
    keys: ['Alt', '0'],
    description: 'Skip to main content',
    category: 'Accessibility'
  },
  {
    keys: ['Alt', '1'],
    description: 'Skip to navigation',
    category: 'Accessibility'
  }
]

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true
) {
  React.useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys: string[] = []

      if (event.ctrlKey || event.metaKey) pressedKeys.push('Ctrl')
      if (event.altKey) pressedKeys.push('Alt')
      if (event.shiftKey) pressedKeys.push('Shift')

      // Add the main key
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        pressedKeys.push(key)
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut => {
        if (shortcut.keys.length !== pressedKeys.length) return false
        return shortcut.keys.every(key => pressedKeys.includes(key))
      })

      if (matchingShortcut?.action) {
        event.preventDefault()
        matchingShortcut.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

/**
 * Display keyboard key badge
 */
function KeyBadge({ shortcut }: { shortcut: string }) {
  // Map common keys to symbols
  const keySymbols: Record<string, string> = {
    Ctrl: '⌃',
    Control: '⌃',
    Alt: '⌥',
    Option: '⌥',
    Shift: '⇧',
    Enter: '↵',
    Escape: 'Esc',
    Command: '⌘',
    Cmd: '⌘'
  }

  const isMac = typeof window !== 'undefined' && /Mac/.test(navigator.platform)

  // Use Command symbol on Mac instead of Ctrl
  let displayKey = shortcut
  if (isMac && shortcut === 'Ctrl') {
    displayKey = 'Cmd'
  }

  const symbol = keySymbols[displayKey]

  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded",
        "bg-muted text-muted-foreground border border-border",
        "min-w-[2rem]"
      )}
    >
      {symbol || displayKey}
    </kbd>
  )
}

/**
 * Keyboard shortcuts dialog
 */
interface KeyboardShortcutsDialogProps {
  shortcuts?: KeyboardShortcut[]
  trigger?: React.ReactNode
}

export function KeyboardShortcutsDialog({
  shortcuts = CARIS_SHORTCUTS,
  trigger
}: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = React.useState(false)

  // Group shortcuts by category
  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {}

    shortcuts.forEach(shortcut => {
      const category = shortcut.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(shortcut)
    })

    return groups
  }, [shortcuts])

  // Register ? key to open shortcuts
  useKeyboardShortcuts([
    {
      keys: ['?'],
      description: 'Show keyboard shortcuts',
      action: () => setOpen(true)
    }
  ])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Keyboard className="h-4 w-4 mr-2" aria-hidden="true" />
            Keyboard Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with CÁRIS more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground flex-1">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1 ml-4">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-xs text-muted-foreground mx-1">+</span>
                          )}
                          <KeyBadge shortcut={key} />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Press <KeyBadge shortcut="?" /> at any time to view these shortcuts.
            Press <KeyBadge shortcut="Escape" /> to close this dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Skip to main content link
 * Should be the first focusable element on the page
 */
export function SkipToMainContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed top-4 left-4 z-50",
        "bg-primary text-primary-foreground",
        "px-4 py-2 rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      onClick={(e) => {
        e.preventDefault()
        const target = document.getElementById(targetId)
        if (target) {
          target.focus()
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }}
    >
      Skip to main content
    </a>
  )
}

/**
 * Skip navigation links component
 */
interface SkipLink {
  href: string
  label: string
}

export function SkipLinks({ links }: { links: SkipLink[] }) {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav
        aria-label="Skip navigation links"
        className="fixed top-4 left-4 z-50 flex flex-col gap-2"
      >
        {links.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className={cn(
              "bg-primary text-primary-foreground px-4 py-2 rounded-md",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
            onClick={(e) => {
              e.preventDefault()
              const target = document.querySelector(link.href) as HTMLElement
              if (target) {
                target.focus()
                target.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

/**
 * Hook to handle common keyboard patterns
 */
export function useCommonKeyboardPatterns() {
  // Prevent default browser shortcuts that might interfere
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Allow Ctrl+S to save instead of browser save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        // Don't prevent if inside a contenteditable or input
        const target = event.target as HTMLElement
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          event.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

/**
 * Keyboard shortcut indicator for buttons
 */
export function ShortcutIndicator({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto pl-2 text-xs text-muted-foreground">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-0.5">+</span>}
          <kbd className="font-mono">{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
