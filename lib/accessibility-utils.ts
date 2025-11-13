/**
 * Accessibility Utilities for CÁRIS Platform
 * WCAG 2.1 Level AA Compliance Helpers
 */

import { useEffect, useRef } from 'react';

/**
 * Generate unique IDs for ARIA associations
 */
let idCounter = 0;
export function generateId(prefix = 'a11y'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Skip to main content link helper
 * Used for keyboard navigation to bypass repetitive content
 */
export interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export function createSkipLink({ targetId, label = 'Skip to main content' }: SkipLinkProps): string {
  return `#${targetId}`;
}

/**
 * Screen reader only CSS class names
 * Visually hides content but keeps it accessible to screen readers
 */
export const srOnly = 'sr-only';
export const srOnlyFocusable = 'sr-only focus:not-sr-only';

/**
 * ARIA label generators for common patterns
 */
export const ariaLabels = {
  /**
   * Generate label for loading state
   */
  loading: (context?: string) =>
    context ? `Loading ${context}...` : 'Loading...',

  /**
   * Generate label for close button
   */
  close: (context?: string) =>
    context ? `Close ${context}` : 'Close',

  /**
   * Generate label for menu toggle
   */
  menuToggle: (isOpen: boolean) =>
    isOpen ? 'Close menu' : 'Open menu',

  /**
   * Generate label for required field
   */
  required: (fieldName: string) =>
    `${fieldName} (required)`,

  /**
   * Generate label for current page in pagination
   */
  currentPage: (page: number) =>
    `Current page, page ${page}`,

  /**
   * Generate label for page link in pagination
   */
  pageLink: (page: number) =>
    `Go to page ${page}`,

  /**
   * Generate label for sort button
   */
  sort: (column: string, direction?: 'ascending' | 'descending') => {
    if (!direction) return `Sort by ${column}`;
    return `Sorted by ${column}, ${direction}. Click to reverse order.`;
  },

  /**
   * Generate label for notification count
   */
  notifications: (count: number) => {
    if (count === 0) return 'No new notifications';
    if (count === 1) return '1 new notification';
    return `${count} new notifications`;
  },

  /**
   * Generate label for delete action with confirmation
   */
  deleteAction: (itemName: string) =>
    `Delete ${itemName}`,

  /**
   * Generate label for edit action
   */
  editAction: (itemName: string) =>
    `Edit ${itemName}`,

  /**
   * Generate label for expand/collapse
   */
  expandCollapse: (isExpanded: boolean, context?: string) => {
    const action = isExpanded ? 'Collapse' : 'Expand';
    return context ? `${action} ${context}` : action;
  },

  /**
   * Generate label for file upload
   */
  fileUpload: (acceptedTypes?: string[]) => {
    const base = 'Choose file to upload';
    if (!acceptedTypes || acceptedTypes.length === 0) return base;
    return `${base}. Accepted file types: ${acceptedTypes.join(', ')}`;
  },

  /**
   * Generate label for date picker
   */
  datePicker: (selectedDate?: Date) => {
    if (!selectedDate) return 'Choose date';
    return `Selected date: ${selectedDate.toLocaleDateString()}. Press Enter to open date picker.`;
  },

  /**
   * Generate label for modal/dialog
   */
  modal: (title: string) =>
    `${title} dialog`,

  /**
   * Generate label for chat message
   */
  chatMessage: (sender: string, timestamp: Date, isOwn: boolean) => {
    const time = timestamp.toLocaleTimeString();
    return isOwn
      ? `You sent a message at ${time}`
      : `${sender} sent a message at ${time}`;
  },

  /**
   * Generate label for mood tracking
   */
  moodRating: (rating: number, maxRating = 5) =>
    `Mood rating ${rating} out of ${maxRating}`,

  /**
   * Generate label for session status
   */
  sessionStatus: (status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => {
    const statusLabels = {
      scheduled: 'Session scheduled',
      'in-progress': 'Session in progress',
      completed: 'Session completed',
      cancelled: 'Session cancelled'
    };
    return statusLabels[status];
  }
};

/**
 * Keyboard navigation helpers
 */
export const keyboardNav = {
  /**
   * Check if key is a navigation key
   */
  isNavigationKey: (key: string): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
  },

  /**
   * Check if key is an action key
   */
  isActionKey: (key: string): boolean => {
    return ['Enter', ' ', 'Space'].includes(key);
  },

  /**
   * Check if key should close dialog/modal
   */
  isCloseKey: (key: string): boolean => {
    return key === 'Escape';
  },

  /**
   * Handle roving tabindex for a list
   */
  handleRovingTabIndex: (
    event: React.KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    onNavigate: (newIndex: number) => void,
    options: { vertical?: boolean; horizontal?: boolean; wrap?: boolean } = {}
  ): void => {
    const { vertical = true, horizontal = false, wrap = true } = options;

    let newIndex = currentIndex;

    if (vertical) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        newIndex = currentIndex + 1;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        newIndex = currentIndex - 1;
      }
    }

    if (horizontal) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        newIndex = currentIndex + 1;
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        newIndex = currentIndex - 1;
      }
    }

    if (event.key === 'Home') {
      event.preventDefault();
      newIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      newIndex = itemCount - 1;
    }

    // Handle wrapping
    if (wrap) {
      if (newIndex < 0) newIndex = itemCount - 1;
      if (newIndex >= itemCount) newIndex = 0;
    } else {
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= itemCount) newIndex = itemCount - 1;
    }

    if (newIndex !== currentIndex) {
      onNavigate(newIndex);
    }
  },

  /**
   * Handle typeahead for lists
   */
  createTypeaheadHandler: (items: string[], onSelect: (index: number) => void) => {
    let searchString = '';
    let searchTimeout: NodeJS.Timeout;

    return (event: React.KeyboardEvent) => {
      // Only handle alphanumeric keys
      if (event.key.length !== 1) return;

      clearTimeout(searchTimeout);
      searchString += event.key.toLowerCase();

      // Find matching item
      const matchIndex = items.findIndex(item =>
        item.toLowerCase().startsWith(searchString)
      );

      if (matchIndex !== -1) {
        onSelect(matchIndex);
      }

      // Clear search string after 500ms
      searchTimeout = setTimeout(() => {
        searchString = '';
      }, 500);
    };
  }
};

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst: (container: HTMLElement): void => {
    const focusableElements = focusUtils.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  },

  /**
   * Focus last focusable element in container
   */
  focusLast: (container: HTMLElement): void => {
    const focusableElements = focusUtils.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  },

  /**
   * Create a focus guard to prevent focus from leaving container
   */
  createFocusGuard: (container: HTMLElement, onEscape?: () => void) => {
    return (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = focusUtils.getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab on first element -> focus last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> focus first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
  }
};

/**
 * Live region announcer for dynamic content
 * Returns a function to announce messages to screen readers
 */
export function createLiveRegionAnnouncer(
  politeness: 'polite' | 'assertive' = 'polite'
): (message: string) => void {
  let liveRegion: HTMLDivElement | null = null;

  return (message: string) => {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    // Clear and set new message
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);
  };
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnouncer(politeness: 'polite' | 'assertive' = 'polite') {
  const announcerRef = useRef<ReturnType<typeof createLiveRegionAnnouncer>>();

  useEffect(() => {
    announcerRef.current = createLiveRegionAnnouncer(politeness);
  }, [politeness]);

  return (message: string) => {
    announcerRef.current?.(message);
  };
}

/**
 * Check if element has visible focus indicator
 */
export function hasFocusIndicator(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  const outline = styles.outline;
  const outlineWidth = styles.outlineWidth;
  const boxShadow = styles.boxShadow;

  // Check for visible outline or box-shadow (common focus indicators)
  return (
    (outline !== 'none' && outline !== '0px') ||
    (outlineWidth !== '0px') ||
    (boxShadow !== 'none')
  );
}

/**
 * Validate heading hierarchy in a container
 * Returns array of issues found
 */
export function validateHeadingHierarchy(container: HTMLElement): string[] {
  const issues: string[] = [];
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

  let previousLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));

    // First heading should be h1
    if (index === 0 && level !== 1) {
      issues.push(`First heading is <${heading.tagName.toLowerCase()}> but should be <h1>`);
    }

    // Check for skipped levels
    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push(
        `Heading level skipped: found <${heading.tagName.toLowerCase()}> after <h${previousLevel}>`
      );
    }

    previousLevel = level;
  });

  return issues;
}

/**
 * Format error messages for screen readers
 */
export function formatErrorMessage(
  fieldName: string,
  errors: string | string[]
): string {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  if (errorArray.length === 0) return '';

  if (errorArray.length === 1) {
    return `${fieldName}: ${errorArray[0]}`;
  }

  return `${fieldName} has ${errorArray.length} errors: ${errorArray.join(', ')}`;
}

/**
 * Create accessible description from multiple sources
 */
export function combineDescriptions(...descriptions: (string | undefined)[]): string {
  return descriptions.filter(Boolean).join('. ');
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if high contrast mode is active
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get appropriate timeout for screen reader announcement
 * Based on message length
 */
export function getAnnouncementDelay(message: string): number {
  // Base delay of 100ms + 50ms per 10 characters
  return 100 + Math.floor(message.length / 10) * 50;
}
