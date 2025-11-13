"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { badgePulseVariants } from "@/lib/animation-utils"

interface PulseDotProps {
  /** Size of the dot */
  size?: "sm" | "md" | "lg"
  /** Color variant */
  variant?: "primary" | "success" | "warning" | "error" | "info"
  /** Enable pulsing animation */
  animated?: boolean
  /** Custom className */
  className?: string
  /** Label for accessibility */
  label?: string
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
}

const variantClasses = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
}

const pulseColors = {
  primary: "rgba(59, 130, 246, 0.7)",
  success: "rgba(34, 197, 94, 0.7)",
  warning: "rgba(234, 179, 8, 0.7)",
  error: "rgba(239, 68, 68, 0.7)",
  info: "rgba(59, 130, 246, 0.7)",
}

export function PulseDot({
  size = "md",
  variant = "primary",
  animated = true,
  className,
  label,
}: PulseDotProps) {
  const Component = animated ? motion.div : "div"

  const animationProps = animated
    ? {
        animate: {
          scale: [1, 1.2, 1],
          boxShadow: [
            `0 0 0 0 ${pulseColors[variant]}`,
            `0 0 0 8px rgba(0, 0, 0, 0)`,
            `0 0 0 0 rgba(0, 0, 0, 0)`,
          ],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }
    : {}

  return (
    <Component
      className={cn("rounded-full", sizeClasses[size], variantClasses[variant], className)}
      aria-label={label}
      {...animationProps}
    />
  )
}

interface StatusIndicatorProps {
  /** Status of the indicator */
  status: "online" | "offline" | "away" | "busy"
  /** Size of the indicator */
  size?: "sm" | "md" | "lg"
  /** Show status text */
  showText?: boolean
  /** Custom className */
  className?: string
}

const statusConfig = {
  online: {
    variant: "success" as const,
    text: "Online",
    animated: true,
  },
  offline: {
    variant: "error" as const,
    text: "Offline",
    animated: false,
  },
  away: {
    variant: "warning" as const,
    text: "Away",
    animated: true,
  },
  busy: {
    variant: "error" as const,
    text: "Busy",
    animated: true,
  },
}

export function StatusIndicator({
  status,
  size = "md",
  showText = false,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PulseDot
        size={size}
        variant={config.variant}
        animated={config.animated}
        label={config.text}
      />
      {showText && (
        <span className="text-sm text-muted-foreground">{config.text}</span>
      )}
    </div>
  )
}

interface NotificationDotProps {
  /** Show the notification dot */
  show?: boolean
  /** Position of the dot */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  /** Count to display (optional) */
  count?: number
  /** Size of the dot */
  size?: "sm" | "md" | "lg"
  /** Color variant */
  variant?: "primary" | "success" | "warning" | "error"
  /** Custom className */
  className?: string
  /** Children to wrap */
  children?: React.ReactNode
}

const positionClasses = {
  "top-right": "top-0 right-0 translate-x-1/2 -translate-y-1/2",
  "top-left": "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
  "bottom-right": "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
  "bottom-left": "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
}

export function NotificationDot({
  show = true,
  position = "top-right",
  count,
  size = "md",
  variant = "error",
  className,
  children,
}: NotificationDotProps) {
  if (!show) return children ? <>{children}</> : null

  const dot = (
    <motion.div
      className={cn(
        "absolute z-10 rounded-full flex items-center justify-center",
        positionClasses[position],
        count !== undefined ? "px-1.5 min-w-5 h-5" : sizeClasses[size],
        variantClasses[variant],
        className
      )}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
      }}
    >
      {count !== undefined && (
        <span className="text-xs font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </motion.div>
  )

  if (children) {
    return (
      <div className="relative inline-block">
        {children}
        {dot}
      </div>
    )
  }

  return dot
}

interface RecordingIndicatorProps {
  /** Whether recording is active */
  isRecording?: boolean
  /** Size of the indicator */
  size?: "sm" | "md" | "lg"
  /** Show recording text */
  showText?: boolean
  /** Custom className */
  className?: string
}

export function RecordingIndicator({
  isRecording = true,
  size = "md",
  showText = false,
  className,
}: RecordingIndicatorProps) {
  if (!isRecording) return null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        className={cn("rounded-full bg-red-500", sizeClasses[size])}
        animate={{
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {showText && (
        <motion.span
          className="text-sm font-medium text-red-500"
          animate={{
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          Recording
        </motion.span>
      )}
    </div>
  )
}

interface LiveIndicatorProps {
  /** Whether live */
  isLive?: boolean
  /** Size of the indicator */
  size?: "sm" | "md" | "lg"
  /** Custom className */
  className?: string
}

export function LiveIndicator({
  isLive = true,
  size = "md",
  className,
}: LiveIndicatorProps) {
  if (!isLive) return null

  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      <motion.div
        className={cn("rounded-full bg-red-500", sizeClasses[size])}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        Live
      </span>
    </motion.div>
  )
}

interface TypingIndicatorProps {
  /** Whether typing animation is active */
  isTyping?: boolean
  /** Size of the dots */
  size?: "sm" | "md" | "lg"
  /** Custom className */
  className?: string
}

export function TypingIndicator({
  isTyping = true,
  size = "md",
  className,
}: TypingIndicatorProps) {
  if (!isTyping) return null

  return (
    <div className={cn("flex items-center gap-1", className)} role="status" aria-label="Typing">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn("rounded-full bg-muted-foreground", sizeClasses[size])}
          animate={{
            y: [0, -4, 0],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
