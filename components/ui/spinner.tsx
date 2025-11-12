"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spinnerVariants } from "@/lib/animation-utils"

interface SpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg" | "xl"
  /** Color variant */
  variant?: "primary" | "secondary" | "white" | "current"
  /** Custom className */
  className?: string
  /** Label for accessibility */
  label?: string
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
  xl: "w-12 h-12 border-4",
}

const variantClasses = {
  primary: "border-primary border-t-transparent",
  secondary: "border-secondary border-t-transparent",
  white: "border-white border-t-transparent",
  current: "border-current border-t-transparent",
}

export function Spinner({
  size = "md",
  variant = "primary",
  className,
  label = "Loading...",
}: SpinnerProps) {
  return (
    <div role="status" aria-label={label}>
      <motion.div
        className={cn(
          "rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        variants={spinnerVariants}
        animate="animate"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

interface LoadingSpinnerProps {
  /** Message to display */
  message?: string
  /** Size of the spinner */
  size?: "sm" | "md" | "lg" | "xl"
  /** Show in center of container */
  centered?: boolean
  /** Custom className */
  className?: string
}

export function LoadingSpinner({
  message,
  size = "md",
  centered = false,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Spinner size={size} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full">
        {content}
      </div>
    )
  }

  return content
}

interface DotSpinnerProps {
  /** Size of each dot */
  size?: "sm" | "md" | "lg"
  /** Color variant */
  variant?: "primary" | "secondary" | "white" | "current"
  /** Custom className */
  className?: string
}

const dotSizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
}

const dotVariantClasses = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  white: "bg-white",
  current: "bg-current",
}

export function DotSpinner({
  size = "md",
  variant = "primary",
  className,
}: DotSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="status">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn(
            "rounded-full",
            dotSizeClasses[size],
            dotVariantClasses[variant]
          )}
          animate={{
            y: [0, -8, 0],
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
      <span className="sr-only">Loading...</span>
    </div>
  )
}

interface PulseSpinnerProps {
  /** Size of the pulse */
  size?: "sm" | "md" | "lg" | "xl"
  /** Color variant */
  variant?: "primary" | "secondary" | "success" | "warning" | "error"
  /** Custom className */
  className?: string
}

const pulseVariantClasses = {
  primary: "bg-primary/20 border-primary",
  secondary: "bg-secondary/20 border-secondary",
  success: "bg-green-500/20 border-green-500",
  warning: "bg-yellow-500/20 border-yellow-500",
  error: "bg-red-500/20 border-red-500",
}

export function PulseSpinner({
  size = "md",
  variant = "primary",
  className,
}: PulseSpinnerProps) {
  return (
    <div className={cn("relative", sizeClasses[size], className)} role="status">
      {/* Inner circle */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full border-2",
          pulseVariantClasses[variant]
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Outer circle */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full border-2",
          pulseVariantClasses[variant]
        )}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
