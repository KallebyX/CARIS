"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

interface ProgressIndicatorProps {
  /** Current progress (0-100) */
  value: number
  /** Show percentage text */
  showPercentage?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Color variant */
  variant?: "primary" | "success" | "warning" | "error"
  /** Custom className */
  className?: string
  /** Label for accessibility */
  label?: string
}

const heightClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

const variantClasses = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
}

export function ProgressIndicator({
  value,
  showPercentage = false,
  size = "md",
  variant = "primary",
  className,
  label = "Progress",
}: ProgressIndicatorProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("w-full", className)} role="progressbar" aria-label={label} aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("relative w-full bg-secondary/20 rounded-full overflow-hidden", heightClasses[size])}>
        <motion.div
          className={cn("h-full rounded-full", variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        />
      </div>
      {showPercentage && (
        <motion.p
          className="text-sm text-muted-foreground mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(clampedValue)}%
        </motion.p>
      )}
    </div>
  )
}

interface CircularProgressProps {
  /** Current progress (0-100) */
  value: number
  /** Size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Color variant */
  variant?: "primary" | "success" | "warning" | "error"
  /** Show percentage in center */
  showPercentage?: boolean
  /** Custom className */
  className?: string
}

const circularVariantColors = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 8,
  variant = "primary",
  showPercentage = true,
  className,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (clampedValue / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={circularVariantColors[variant]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 1,
            ease: "easeInOut",
          }}
        />
      </svg>
      {showPercentage && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-sm font-medium">{Math.round(clampedValue)}%</span>
        </motion.div>
      )}
    </div>
  )
}

interface StepProgressProps {
  /** Current step (0-indexed) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Step labels */
  labels?: string[]
  /** Custom className */
  className?: string
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels,
  className,
}: StepProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <motion.div
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2 z-10",
                index < currentStep
                  ? "bg-primary border-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-muted-foreground/30 text-muted-foreground"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              {index < currentStep ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  <CheckIcon className="w-4 h-4" />
                </motion.div>
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </motion.div>

            {/* Connector line */}
            {index < totalSteps - 1 && (
              <div className="flex-1 h-0.5 bg-muted-foreground/20 mx-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{
                    width: index < currentStep ? "100%" : "0%",
                  }}
                  transition={{
                    delay: index * 0.1 + 0.1,
                    duration: 0.3,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      {labels && labels.length === totalSteps && (
        <div className="flex justify-between mt-2">
          {labels.map((label, index) => (
            <motion.div
              key={index}
              className={cn(
                "text-xs text-center",
                index <= currentStep
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              style={{ width: `${100 / totalSteps}%` }}
            >
              {label}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface LoadingBarProps {
  /** Show indeterminate loading animation */
  indeterminate?: boolean
  /** Progress value (0-100) for determinate mode */
  value?: number
  /** Color variant */
  variant?: "primary" | "success" | "warning" | "error"
  /** Custom className */
  className?: string
}

export function LoadingBar({
  indeterminate = true,
  value = 0,
  variant = "primary",
  className,
}: LoadingBarProps) {
  if (indeterminate) {
    return (
      <div className={cn("w-full h-1 bg-secondary/20 rounded-full overflow-hidden", className)}>
        <motion.div
          className={cn("h-full rounded-full", variantClasses[variant])}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: "50%" }}
        />
      </div>
    )
  }

  return (
    <ProgressIndicator
      value={value}
      size="sm"
      variant={variant}
      className={className}
    />
  )
}
