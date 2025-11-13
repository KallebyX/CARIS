/**
 * useFocusManagement Hook
 * Advanced focus management utilities for complex components
 * WCAG 2.1 Level AA Compliance
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to manage focus-visible state
 * Shows focus indicator only for keyboard navigation
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const hadKeyboardEventRef = useRef(false);
  const hadFocusVisibleRecentlyRef = useRef(false);
  const hadFocusVisibleRecentlyTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Shift') {
        hadKeyboardEventRef.current = true;
      }
    };

    const handlePointerDown = () => {
      hadKeyboardEventRef.current = false;
    };

    const handleFocus = () => {
      if (hadKeyboardEventRef.current) {
        setIsFocusVisible(true);
        hadFocusVisibleRecentlyRef.current = true;

        clearTimeout(hadFocusVisibleRecentlyTimeoutRef.current);
        hadFocusVisibleRecentlyTimeoutRef.current = setTimeout(() => {
          hadFocusVisibleRecentlyRef.current = false;
        }, 100);
      } else {
        setIsFocusVisible(false);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('touchstart', handlePointerDown, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('touchstart', handlePointerDown, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
      clearTimeout(hadFocusVisibleRecentlyTimeoutRef.current);
    };
  }, []);

  return isFocusVisible;
}

/**
 * Hook to restore focus to a previous element
 */
export function useFocusRestore() {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook to manage roving tabindex for lists and grids
 * Only one item in the list should be tabbable at a time
 */
export function useRovingTabIndex(
  itemCount: number,
  options: {
    defaultIndex?: number;
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
) {
  const { defaultIndex = 0, orientation = 'both', loop = true } = options;
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  const setItemRef = useCallback((index: number) => {
    return (element: HTMLElement | null) => {
      itemRefs.current[index] = element;
    };
  }, []);

  const focusItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item) {
      item.focus();
      setActiveIndex(index);
    }
  }, []);

  const getNextIndex = useCallback(
    (currentIndex: number, direction: 'next' | 'prev') => {
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

      if (loop) {
        if (nextIndex < 0) nextIndex = itemCount - 1;
        if (nextIndex >= itemCount) nextIndex = 0;
      } else {
        nextIndex = Math.max(0, Math.min(itemCount - 1, nextIndex));
      }

      return nextIndex;
    },
    [itemCount, loop]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      let handled = false;

      if (orientation === 'vertical' || orientation === 'both') {
        if (event.key === 'ArrowDown') {
          focusItem(getNextIndex(currentIndex, 'next'));
          handled = true;
        } else if (event.key === 'ArrowUp') {
          focusItem(getNextIndex(currentIndex, 'prev'));
          handled = true;
        }
      }

      if (orientation === 'horizontal' || orientation === 'both') {
        if (event.key === 'ArrowRight') {
          focusItem(getNextIndex(currentIndex, 'next'));
          handled = true;
        } else if (event.key === 'ArrowLeft') {
          focusItem(getNextIndex(currentIndex, 'prev'));
          handled = true;
        }
      }

      if (event.key === 'Home') {
        focusItem(0);
        handled = true;
      } else if (event.key === 'End') {
        focusItem(itemCount - 1);
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [orientation, itemCount, focusItem, getNextIndex]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (event: React.KeyboardEvent) => handleKeyDown(event, index),
      onFocus: () => setActiveIndex(index)
    }),
    [activeIndex, setItemRef, handleKeyDown]
  );

  return {
    activeIndex,
    setActiveIndex,
    getItemProps,
    focusItem
  };
}

/**
 * Hook to manage focus within a specific element
 * Returns whether the element or its children have focus
 */
export function useFocusWithin<T extends HTMLElement = HTMLElement>() {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = (event: FocusEvent) => {
      if (element.contains(event.target as Node)) {
        setIsFocusWithin(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (
        !element.contains(event.relatedTarget as Node) &&
        element.contains(event.target as Node)
      ) {
        setIsFocusWithin(false);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { isFocusWithin, ref };
}

/**
 * Hook to auto-focus an element when it mounts
 */
export function useAutoFocus<T extends HTMLElement = HTMLElement>(
  options: {
    enabled?: boolean;
    delay?: number;
    selectText?: boolean;
  } = {}
) {
  const { enabled = true, delay = 0, selectText = false } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const timeoutId = setTimeout(() => {
      if (ref.current) {
        ref.current.focus();

        // Select text if it's an input element
        if (selectText && ref.current instanceof HTMLInputElement) {
          ref.current.select();
        }
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, delay, selectText]);

  return ref;
}

/**
 * Hook to detect if focus is moving in or out of an element
 */
export function useFocusEvents<T extends HTMLElement = HTMLElement>(callbacks: {
  onFocusIn?: (event: FocusEvent) => void;
  onFocusOut?: (event: FocusEvent) => void;
}) {
  const { onFocusIn, onFocusOut } = callbacks;
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = (event: FocusEvent) => {
      if (onFocusIn && element.contains(event.target as Node)) {
        onFocusIn(event);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (
        onFocusOut &&
        !element.contains(event.relatedTarget as Node) &&
        element.contains(event.target as Node)
      ) {
        onFocusOut(event);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, [onFocusIn, onFocusOut]);

  return ref;
}

/**
 * Hook to create a focus scope that prevents focus from leaving
 * Similar to focus trap but less aggressive
 */
export function useFocusScope<T extends HTMLElement = HTMLElement>(
  options: {
    enabled?: boolean;
    contain?: boolean;
    restoreFocus?: boolean;
  } = {}
) {
  const { enabled = true, contain = true, restoreFocus = true } = options;
  const ref = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const handleFocusOut = (event: FocusEvent) => {
      if (!contain || !ref.current) return;

      const relatedTarget = event.relatedTarget as HTMLElement;

      // If focus is leaving the scope, prevent it
      if (relatedTarget && !ref.current.contains(relatedTarget)) {
        event.preventDefault();
        (event.target as HTMLElement).focus();
      }
    };

    const element = ref.current;
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusout', handleFocusOut);

      // Restore focus when unmounting
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [enabled, contain, restoreFocus]);

  return ref;
}

/**
 * Hook to manage focus lock for complex overlays
 * Combines multiple focus management strategies
 */
export function useFocusLock<T extends HTMLElement = HTMLElement>(
  isActive: boolean,
  options: {
    onEscape?: () => void;
    autoFocus?: boolean;
    restoreFocus?: boolean;
    focusSelector?: string;
  } = {}
) {
  const {
    onEscape,
    autoFocus = true,
    restoreFocus = true,
    focusSelector
  } = options;

  const ref = useRef<T>(null);
  const { saveFocus, restoreFocus: restore } = useFocusRestore();

  useEffect(() => {
    if (!isActive) return;

    saveFocus();

    if (autoFocus && ref.current) {
      const elementToFocus = focusSelector
        ? ref.current.querySelector<HTMLElement>(focusSelector)
        : ref.current;

      if (elementToFocus) {
        setTimeout(() => elementToFocus.focus(), 0);
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (restoreFocus) {
        restore();
      }
    };
  }, [isActive, autoFocus, focusSelector, onEscape, restoreFocus, saveFocus, restore]);

  return ref;
}
