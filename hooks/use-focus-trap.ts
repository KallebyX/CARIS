/**
 * useFocusTrap Hook
 * Traps focus within a container for modals, dialogs, and other overlays
 * WCAG 2.1 Level AA Compliance
 */

import { useEffect, useRef, useCallback } from 'react';
import { focusUtils } from '@/lib/accessibility-utils';

export interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  enabled?: boolean;

  /**
   * Whether to focus the first element when trap activates
   */
  initialFocus?: boolean;

  /**
   * Whether to restore focus when trap deactivates
   */
  restoreFocus?: boolean;

  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Selector for the element to focus initially
   * If not provided, focuses first focusable element
   */
  initialFocusSelector?: string;

  /**
   * Whether to allow focus to leave via Tab after last element wraps to first
   */
  allowOutsideFocus?: boolean;
}

/**
 * Hook to trap focus within a container element
 * Useful for modals, dialogs, and popups to ensure keyboard users stay within the component
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    initialFocus = true,
    restoreFocus = true,
    onEscape,
    initialFocusSelector,
    allowOutsideFocus = false
  } = options;

  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  /**
   * Focus the first focusable element in the container
   */
  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return;

    // Try to focus element matching selector
    if (initialFocusSelector) {
      const element = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
      if (element) {
        element.focus();
        return;
      }
    }

    // Otherwise focus first focusable element
    focusUtils.focusFirst(containerRef.current);
  }, [initialFocusSelector]);

  /**
   * Handle keydown events for focus trapping
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current || !enabled) return;

      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      // Only trap Tab key
      if (event.key !== 'Tab') return;

      const focusableElements = focusUtils.getFocusableElements(containerRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Check if focus is within container
      const isFocusInContainer = containerRef.current.contains(activeElement);

      if (!isFocusInContainer) {
        // Focus escaped somehow, bring it back
        event.preventDefault();
        focusFirstElement();
        return;
      }

      // Shift + Tab on first element
      if (event.shiftKey && activeElement === firstElement) {
        if (!allowOutsideFocus) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab on last element
      else if (!event.shiftKey && activeElement === lastElement) {
        if (!allowOutsideFocus) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, onEscape, focusFirstElement, allowOutsideFocus]
  );

  /**
   * Handle focus leaving the container
   */
  const handleFocusOut = useCallback(
    (event: FocusEvent) => {
      if (!containerRef.current || !enabled || allowOutsideFocus) return;

      const relatedTarget = event.relatedTarget as HTMLElement;

      // If focus is moving outside the container, bring it back
      if (relatedTarget && !containerRef.current.contains(relatedTarget)) {
        event.preventDefault();
        focusFirstElement();
      }
    },
    [enabled, focusFirstElement, allowOutsideFocus]
  );

  /**
   * Setup and teardown focus trap
   */
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the currently focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Focus first element if requested
    if (initialFocus) {
      // Use setTimeout to ensure the element is rendered
      const timeoutId = setTimeout(() => {
        focusFirstElement();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, initialFocus, focusFirstElement]);

  /**
   * Add event listeners
   */
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Add keydown listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Add focusout listener to container
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusout', handleFocusOut);

      // Restore focus when unmounting
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [enabled, handleKeyDown, handleFocusOut, restoreFocus]);

  return containerRef;
}

/**
 * Simple focus trap for quick use cases
 * Returns a ref to attach to the container element
 */
export function useSimpleFocusTrap<T extends HTMLElement = HTMLDivElement>(
  enabled = true,
  onEscape?: () => void
) {
  return useFocusTrap<T>({
    enabled,
    onEscape,
    initialFocus: true,
    restoreFocus: true
  });
}
