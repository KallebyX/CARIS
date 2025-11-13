"use client"

import React from "react"
import { motion } from "framer-motion"
import { XIcon, AlertTriangleIcon, AlertCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { errorVariants, shakeVariants } from "@/lib/animation-utils"

interface ErrorAnimationProps {
  /** Size of the animation */
  size?: "sm" | "md" | "lg" | "xl"
  /** Error message */
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

export function ErrorAnimation({
  size = "md",
  message,
  className,
  onComplete,
}: ErrorAnimationProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-red-500/10 border-2 border-red-500",
          sizeClasses[size]
        )}
        variants={errorVariants}
        initial="hidden"
        animate={["visible", "shake"]}
        onAnimationComplete={onComplete}
      >
        <XIcon className={cn("text-red-500", iconSizeClasses[size])} />

        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </motion.div>

      {message && (
        <motion.p
          className="text-sm font-medium text-red-600 dark:text-red-400 text-center"
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

interface ErrorShakeProps {
  /** Trigger shake animation */
  shake?: boolean
  /** Children to shake */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

export function ErrorShake({ shake = false, children, className }: ErrorShakeProps) {
  return (
    <motion.div
      className={className}
      animate={shake ? shakeVariants.animate : {}}
    >
      {children}
    </motion.div>
  )
}

interface ErrorBannerProps {
  /** Error message */
  message: string
  /** Optional description */
  description?: string
  /** Error type */
  type?: "error" | "warning"
  /** Show the banner */
  show?: boolean
  /** Callback when closed */
  onClose?: () => void
  /** Auto-hide after milliseconds */
  autoHideDuration?: number
  /** Custom className */
  className?: string
}

export function ErrorBanner({
  message,
  description,
  type = "error",
  show = true,
  onClose,
  autoHideDuration,
  className,
}: ErrorBannerProps) {
  if (!show) return null

  React.useEffect(() => {
    if (autoHideDuration && onClose) {
      const timer = setTimeout(onClose, autoHideDuration)
      return () => clearTimeout(timer)
    }
  }, [autoHideDuration, onClose])

  const isError = type === "error"
  const Icon = isError ? AlertCircleIcon : AlertTriangleIcon

  return (
    <motion.div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        isError
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      variants={errorVariants}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 20 }}
      >
        <Icon
          className={cn(
            "w-5 h-5",
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-yellow-600 dark:text-yellow-400"
          )}
        />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.p
          className={cn(
            "text-sm font-medium",
            isError
              ? "text-red-900 dark:text-red-100"
              : "text-yellow-900 dark:text-yellow-100"
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.p>
        {description && (
          <motion.p
            className={cn(
              "text-sm mt-1",
              isError
                ? "text-red-700 dark:text-red-300"
                : "text-yellow-700 dark:text-yellow-300"
            )}
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
          className={cn(
            "hover:opacity-70",
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-yellow-600 dark:text-yellow-400"
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <XIcon className="w-5 h-5" />
        </motion.button>
      )}
    </motion.div>
  )
}

interface ValidationErrorProps {
  /** Error message */
  message?: string
  /** Show the error */
  show?: boolean
  /** Custom className */
  className?: string
}

export function ValidationError({
  message,
  show = false,
  className,
}: ValidationErrorProps) {
  if (!show || !message) return null

  return (
    <motion.p
      className={cn("text-sm text-red-600 dark:text-red-400 flex items-center gap-2", className)}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      variants={shakeVariants}
    >
      <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </motion.p>
  )
}

interface ErrorStateProps {
  /** Error title */
  title?: string
  /** Error message */
  message?: string
  /** Retry callback */
  onRetry?: () => void
  /** Custom icon */
  icon?: React.ReactNode
  /** Custom className */
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content.",
  onRetry,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      className={cn("flex flex-col items-center justify-center p-8 text-center", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
      >
        {icon || (
          <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mb-4">
            <AlertCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        )}
      </motion.div>

      <motion.h3
        className="text-lg font-semibold text-foreground mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      <motion.p
        className="text-sm text-muted-foreground mb-6 max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>

      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  )
}
