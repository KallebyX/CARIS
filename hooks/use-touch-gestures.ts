"use client"

import { useRef, useEffect, useState, useCallback } from 'react'

/* ============================================
   Types and Interfaces
   ============================================ */

export interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeStart?: (direction: SwipeDirection) => void
  onSwipeEnd?: (direction: SwipeDirection) => void
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

export interface SwipeConfig {
  threshold?: number // Minimum distance in pixels to trigger swipe
  velocity?: number // Minimum velocity to trigger swipe
  preventScroll?: boolean // Prevent default scroll behavior
}

export interface LongPressConfig {
  threshold?: number // Time in ms to trigger long press (default: 500)
  onStart?: () => void
  onFinish?: () => void
  onCancel?: () => void
}

export interface PinchConfig {
  onPinchStart?: (distance: number) => void
  onPinchMove?: (scale: number, distance: number) => void
  onPinchEnd?: (scale: number) => void
}

export interface DragConfig {
  onDragStart?: (position: { x: number; y: number }) => void
  onDragMove?: (position: { x: number; y: number }, delta: { x: number; y: number }) => void
  onDragEnd?: (position: { x: number; y: number }) => void
}

/* ============================================
   useSwipe Hook
   ============================================ */

/**
 * Hook for detecting swipe gestures
 * @param callbacks - Callback functions for different swipe directions
 * @param config - Configuration for swipe detection
 * @returns Ref to attach to swipeable element
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocity = 0.3,
    preventScroll = false,
  } = config

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const elementRef = useRef<T>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault()
      }

      const touch = e.touches[0]
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return

      if (preventScroll) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y
      const deltaTime = Date.now() - touchStart.current.time

      const velocityX = Math.abs(deltaX) / deltaTime
      const velocityY = Math.abs(deltaY) / deltaTime

      // Determine swipe direction
      let direction: SwipeDirection = null

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > threshold && velocityX > velocity) {
          direction = deltaX > 0 ? 'right' : 'left'
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > threshold && velocityY > velocity) {
          direction = deltaY > 0 ? 'down' : 'up'
        }
      }

      // Call appropriate callback
      if (direction) {
        callbacks.onSwipeEnd?.(direction)

        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.()
            break
          case 'right':
            callbacks.onSwipeRight?.()
            break
          case 'up':
            callbacks.onSwipeUp?.()
            break
          case 'down':
            callbacks.onSwipeDown?.()
            break
        }
      }

      touchStart.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [callbacks, threshold, velocity, preventScroll])

  return elementRef
}

/* ============================================
   useLongPress Hook
   ============================================ */

/**
 * Hook for detecting long press gestures
 * @param callback - Function to call on long press
 * @param config - Configuration for long press detection
 * @returns Object with event handlers
 */
export function useLongPress<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  config: LongPressConfig = {}
) {
  const {
    threshold = 500,
    onStart,
    onFinish,
    onCancel,
  } = config

  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const elementRef = useRef<T>(null)

  const start = useCallback(() => {
    setIsLongPressing(true)
    onStart?.()

    timerRef.current = setTimeout(() => {
      callback()
      onFinish?.()
      setIsLongPressing(false)
    }, threshold)
  }, [callback, threshold, onStart, onFinish])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isLongPressing) {
      onCancel?.()
      setIsLongPressing(false)
    }
  }, [isLongPressing, onCancel])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Mouse events
    element.addEventListener('mousedown', start)
    element.addEventListener('mouseup', cancel)
    element.addEventListener('mouseleave', cancel)

    // Touch events
    element.addEventListener('touchstart', start)
    element.addEventListener('touchend', cancel)
    element.addEventListener('touchcancel', cancel)

    return () => {
      element.removeEventListener('mousedown', start)
      element.removeEventListener('mouseup', cancel)
      element.removeEventListener('mouseleave', cancel)
      element.removeEventListener('touchstart', start)
      element.removeEventListener('touchend', cancel)
      element.removeEventListener('touchcancel', cancel)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [start, cancel])

  return {
    ref: elementRef,
    isLongPressing,
  }
}

/* ============================================
   usePinch Hook
   ============================================ */

/**
 * Hook for detecting pinch-to-zoom gestures
 * @param callbacks - Callback functions for pinch events
 * @returns Ref to attach to pinchable element
 */
export function usePinch<T extends HTMLElement = HTMLElement>(
  callbacks: PinchConfig
) {
  const elementRef = useRef<T>(null)
  const initialDistance = useRef<number>(0)
  const currentScale = useRef<number>(1)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const getDistance = (touches: TouchList): number => {
      const touch1 = touches[0]
      const touch2 = touches[1]

      const dx = touch1.clientX - touch2.clientX
      const dy = touch1.clientY - touch2.clientY

      return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()

        const distance = getDistance(e.touches)
        initialDistance.current = distance

        callbacks.onPinchStart?.(distance)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()

        const distance = getDistance(e.touches)
        const scale = distance / initialDistance.current

        currentScale.current = scale

        callbacks.onPinchMove?.(scale, distance)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (initialDistance.current > 0) {
        callbacks.onPinchEnd?.(currentScale.current)

        initialDistance.current = 0
        currentScale.current = 1
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [callbacks])

  return elementRef
}

/* ============================================
   useDrag Hook
   ============================================ */

/**
 * Hook for detecting drag gestures
 * @param callbacks - Callback functions for drag events
 * @returns Ref to attach to draggable element
 */
export function useDrag<T extends HTMLElement = HTMLElement>(
  callbacks: DragConfig
) {
  const elementRef = useRef<T>(null)
  const isDragging = useRef(false)
  const startPosition = useRef({ x: 0, y: 0 })
  const lastPosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const getPosition = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      if ('touches' in e) {
        const touch = e.touches[0]
        return { x: touch.clientX, y: touch.clientY }
      }
      return { x: e.clientX, y: e.clientY }
    }

    const handleStart = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true
      const position = getPosition(e)
      startPosition.current = position
      lastPosition.current = position

      callbacks.onDragStart?.(position)
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return

      e.preventDefault()

      const position = getPosition(e)
      const delta = {
        x: position.x - lastPosition.current.x,
        y: position.y - lastPosition.current.y,
      }

      lastPosition.current = position

      callbacks.onDragMove?.(position, delta)
    }

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return

      isDragging.current = false

      const position = 'changedTouches' in e
        ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
        : { x: e.clientX, y: e.clientY }

      callbacks.onDragEnd?.(position)
    }

    // Mouse events
    element.addEventListener('mousedown', handleStart)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)

    // Touch events
    element.addEventListener('touchstart', handleStart)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)

    return () => {
      element.removeEventListener('mousedown', handleStart)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      element.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [callbacks])

  return elementRef
}

/* ============================================
   useDoubleTap Hook
   ============================================ */

/**
 * Hook for detecting double tap gestures
 * @param callback - Function to call on double tap
 * @param delay - Maximum time between taps in ms (default: 300)
 * @returns Ref to attach to element
 */
export function useDoubleTap<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  delay: number = 300
) {
  const elementRef = useRef<T>(null)
  const lastTap = useRef<number>(0)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTap = () => {
      const now = Date.now()
      const timeSinceLastTap = now - lastTap.current

      if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
        callback()
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
    }

    element.addEventListener('click', handleTap)
    element.addEventListener('touchend', handleTap)

    return () => {
      element.removeEventListener('click', handleTap)
      element.removeEventListener('touchend', handleTap)
    }
  }, [callback, delay])

  return elementRef
}

/* ============================================
   useTouchGestures Hook (Combined)
   ============================================ */

/**
 * Combined hook for all touch gestures
 * Provides all gesture handlers in one hook
 */
export function useTouchGestures<T extends HTMLElement = HTMLElement>() {
  const [activeGesture, setActiveGesture] = useState<
    'swipe' | 'longPress' | 'pinch' | 'drag' | 'doubleTap' | null
  >(null)

  return {
    activeGesture,
    setActiveGesture,
  }
}
