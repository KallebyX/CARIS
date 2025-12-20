"use client"

import { motion } from "framer-motion"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { successVariants, checkmarkVariants } from "@/lib/animation-utils"

interface SuccessAnimationProps {
  /** Size of the animation */
  size?: "sm" | "md" | "lg" | "xl"
  /** Show success message */
  message?: string
  /** Custom className */
  className?: string
  /** Callback when animation completes */
  onComplete?: () => void
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
}

const iconSizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
}

export function SuccessAnimation({
  size = "md",
  message,
  className,
  onComplete,
}: SuccessAnimationProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-green-500/10 border-2 border-green-500",
          sizeClasses[size]
        )}
        variants={successVariants}
        initial="hidden"
        animate="visible"
        onAnimationComplete={onComplete}
      >
        <CheckIcon className={cn("text-green-500", iconSizeClasses[size])} />

        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-green-500"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </motion.div>

      {message && (
        <motion.p
          className="text-sm font-medium text-green-600 dark:text-green-400 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}

interface CheckmarkAnimationProps {
  /** Size of the checkmark */
  size?: number
  /** Color of the checkmark */
  color?: string
  /** Stroke width */
  strokeWidth?: number
  /** Custom className */
  className?: string
}

export function CheckmarkAnimation({
  size = 60,
  color = "#22c55e",
  strokeWidth = 3,
  className,
}: CheckmarkAnimationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={className}
    >
      <motion.circle
        cx="30"
        cy="30"
        r="25"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <motion.path
        d="M15 30 L25 40 L45 20"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkmarkVariants}
        initial="hidden"
        animate="visible"
      />
    </svg>
  )
}

interface SuccessCheckProps {
  /** Show the success check */
  show?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Custom className */
  className?: string
}

export function SuccessCheck({
  show = true,
  size = "md",
  className,
}: SuccessCheckProps) {
  if (!show) return null

  const sizes = {
    sm: 40,
    md: 60,
    lg: 80,
  }

  return (
    <motion.div
      className={cn("inline-flex", className)}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      <CheckmarkAnimation size={sizes[size]} />
    </motion.div>
  )
}

interface SuccessBannerProps {
  /** Success message */
  message: string
  /** Optional description */
  description?: string
  /** Show the banner */
  show?: boolean
  /** Callback when closed */
  onClose?: () => void
  /** Auto-hide after milliseconds */
  autoHideDuration?: number
  /** Custom className */
  className?: string
}

export function SuccessBanner({
  message,
  description,
  show = true,
  onClose,
  autoHideDuration,
  className,
}: SuccessBannerProps) {
  React.useEffect(() => {
    if (show && autoHideDuration && onClose) {
      const timer = setTimeout(onClose, autoHideDuration)
      return () => clearTimeout(timer)
    }
  }, [show, autoHideDuration, onClose])

  if (!show) return null

  return (
    <motion.div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800",
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 20 }}
      >
        <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.p
          className="text-sm font-medium text-green-900 dark:text-green-100"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.p>
        {description && (
          <motion.p
            className="text-sm text-green-700 dark:text-green-300 mt-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      {onClose && (
        <motion.button
          onClick={onClose}
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  )
}

// Re-export React for the SuccessBanner component
import React from "react"
