"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface RippleProps {
  /** X coordinate of ripple center */
  x: number
  /** Y coordinate of ripple center */
  y: number
  /** Ripple color */
  color?: string
  /** Duration of ripple animation (ms) */
  duration?: number
  /** Size of the ripple */
  size?: number
  /** Callback when animation completes */
  onComplete?: () => void
}

function Ripple({ x, y, color = "currentColor", duration = 600, size = 100, onComplete }: RippleProps) {
  return (
    <motion.span
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        backgroundColor: color,
      }}
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 2, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: duration / 1000,
        ease: "easeOut",
      }}
      onAnimationComplete={onComplete}
    />
  )
}

interface RippleEffectProps {
  /** Color of ripple */
  color?: string
  /** Duration of ripple animation (ms) */
  duration?: number
  /** Children to wrap */
  children: React.ReactNode
  /** Custom className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function RippleEffect({
  color = "rgba(255, 255, 255, 0.3)",
  duration = 600,
  children,
  className,
  disabled = false,
}: RippleEffectProps) {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const newRipple = {
      id: Date.now(),
      x,
      y,
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, duration)
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <Ripple
            key={ripple.id}
            x={ripple.x}
            y={ripple.y}
            color={color}
            duration={duration}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ripple color */
  rippleColor?: string
  /** Ripple duration (ms) */
  rippleDuration?: number
  /** Children */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

export function RippleButton({
  rippleColor = "rgba(255, 255, 255, 0.4)",
  rippleDuration = 600,
  children,
  className,
  disabled,
  ...props
}: RippleButtonProps) {
  return (
    <RippleEffect
      color={rippleColor}
      duration={rippleDuration}
      className={cn("inline-flex items-center justify-center", className)}
      disabled={disabled}
    >
      <button disabled={disabled} {...props}>
        {children}
      </button>
    </RippleEffect>
  )
}

interface WaveEffectProps {
  /** Trigger wave animation */
  trigger?: boolean
  /** Children to wrap */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

export function WaveEffect({ trigger = false, children, className }: WaveEffectProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={
        trigger
          ? {
              scale: [1, 1.05, 1],
            }
          : {}
      }
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
    >
      {children}
      {trigger && (
        <motion.div
          className="absolute inset-0 border-2 border-primary rounded-full pointer-events-none"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        />
      )}
    </motion.div>
  )
}

interface PulseRingProps {
  /** Color of the ring */
  color?: string
  /** Number of rings */
  rings?: number
  /** Custom className */
  className?: string
}

export function PulseRing({ color = "#3b82f6", rings = 3, className }: PulseRingProps) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      {Array.from({ length: rings }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}

interface ClickFeedbackProps {
  /** Children to wrap */
  children: React.ReactNode
  /** Scale on click */
  scale?: number
  /** Custom className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function ClickFeedback({
  children,
  scale = 0.95,
  className,
  disabled = false,
}: ClickFeedbackProps) {
  return (
    <motion.div
      className={className}
      whileTap={disabled ? {} : { scale }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

interface HoverGlowProps {
  /** Children to wrap */
  children: React.ReactNode
  /** Glow color */
  glowColor?: string
  /** Custom className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

export function HoverGlow({
  children,
  glowColor = "rgba(59, 130, 246, 0.5)",
  className,
  disabled = false,
}: HoverGlowProps) {
  return (
    <motion.div
      className={className}
      whileHover={
        disabled
          ? {}
          : {
              boxShadow: `0 0 20px ${glowColor}`,
              scale: 1.02,
            }
      }
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

interface SwipeIndicatorProps {
  /** Direction of swipe */
  direction: "left" | "right" | "up" | "down"
  /** Show indicator */
  show?: boolean
  /** Custom className */
  className?: string
}

export function SwipeIndicator({
  direction,
  show = true,
  className,
}: SwipeIndicatorProps) {
  if (!show) return null

  const variants = {
    left: { x: [0, -20, 0] },
    right: { x: [0, 20, 0] },
    up: { y: [0, -20, 0] },
    down: { y: [0, 20, 0] },
  }

  const arrows = {
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
  }

  return (
    <motion.div
      className={cn("text-4xl text-muted-foreground", className)}
      animate={variants[direction]}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {arrows[direction]}
    </motion.div>
  )
}

interface CopyFeedbackProps {
  /** Show feedback */
  show?: boolean
  /** Message to display */
  message?: string
  /** Custom className */
  className?: string
}

export function CopyFeedback({
  show = false,
  message = "Copied!",
  className,
}: CopyFeedbackProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shadow-lg",
            className
          )}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {message}
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
