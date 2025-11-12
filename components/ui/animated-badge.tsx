"use client"

import * as React from "react"
import { motion, MotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AnimatedBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Enable pulse animation */
  pulse?: boolean
  /** Enable bounce animation */
  bounce?: boolean
  /** Enable glow effect */
  glow?: boolean
  /** Show notification dot */
  showDot?: boolean
  /** Custom motion props */
  motionProps?: MotionProps
}

const AnimatedBadge = React.forwardRef<HTMLDivElement, AnimatedBadgeProps>(
  ({ className, variant, pulse, bounce, glow, showDot, motionProps, children, ...props }, ref) => {
    const getPulseAnimation = (): MotionProps => {
      if (!pulse) return {}

      return {
        animate: {
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 0 0 rgba(59, 130, 246, 0.7)",
            "0 0 0 10px rgba(59, 130, 246, 0)",
            "0 0 0 0 rgba(59, 130, 246, 0)",
          ],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }
    }

    const getBounceAnimation = (): MotionProps => {
      if (!bounce) return {}

      return {
        animate: {
          y: [0, -5, 0],
        },
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }
    }

    const getGlowAnimation = (): MotionProps => {
      if (!glow) return {}

      return {
        animate: {
          boxShadow: [
            "0 0 5px rgba(59, 130, 246, 0.5)",
            "0 0 20px rgba(59, 130, 246, 0.8)",
            "0 0 5px rgba(59, 130, 246, 0.5)",
          ],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }
    }

    const combinedMotionProps = {
      ...getPulseAnimation(),
      ...(bounce ? getBounceAnimation() : {}),
      ...(glow ? getGlowAnimation() : {}),
      ...motionProps,
    }

    return (
      <motion.div
        ref={ref}
        className={cn(badgeVariants({ variant }), "relative", className)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, ...combinedMotionProps.animate }}
        transition={combinedMotionProps.transition}
        {...props}
      >
        {showDot && (
          <motion.span
            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )}
        {children}
      </motion.div>
    )
  }
)
AnimatedBadge.displayName = "AnimatedBadge"

/**
 * Count Badge - Badge with animated count
 */
interface CountBadgeProps extends Omit<AnimatedBadgeProps, "children"> {
  /** Count to display */
  count: number
  /** Maximum count to display (shows "99+" if exceeded) */
  max?: number
}

const CountBadge = React.forwardRef<HTMLDivElement, CountBadgeProps>(
  ({ count, max = 99, className, ...props }, ref) => {
    const displayCount = count > max ? `${max}+` : count

    return (
      <AnimatedBadge
        ref={ref}
        className={cn("min-w-5 justify-center", className)}
        pulse={count > 0}
        {...props}
      >
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {displayCount}
        </motion.span>
      </AnimatedBadge>
    )
  }
)
CountBadge.displayName = "CountBadge"

/**
 * Status Badge - Badge with status indicator
 */
interface StatusBadgeProps extends Omit<AnimatedBadgeProps, "variant"> {
  /** Status type */
  status: "online" | "offline" | "away" | "busy"
}

const statusConfig = {
  online: {
    variant: "success" as const,
    text: "Online",
    pulse: true,
  },
  offline: {
    variant: "secondary" as const,
    text: "Offline",
    pulse: false,
  },
  away: {
    variant: "warning" as const,
    text: "Away",
    pulse: true,
  },
  busy: {
    variant: "destructive" as const,
    text: "Busy",
    pulse: true,
  },
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = statusConfig[status]

    return (
      <AnimatedBadge
        ref={ref}
        variant={config.variant}
        pulse={config.pulse}
        className={cn("gap-1.5", className)}
        {...props}
      >
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={
            config.pulse
              ? {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }
              : {}
          }
          transition={
            config.pulse
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                }
              : undefined
          }
        />
        {config.text}
      </AnimatedBadge>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

/**
 * New Badge - Badge with "New" text and pulse
 */
const NewBadge = React.forwardRef<HTMLDivElement, Omit<AnimatedBadgeProps, "children">>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedBadge
        ref={ref}
        variant="destructive"
        pulse
        className={className}
        {...props}
      >
        New
      </AnimatedBadge>
    )
  }
)
NewBadge.displayName = "NewBadge"

/**
 * Beta Badge - Badge with "Beta" text
 */
const BetaBadge = React.forwardRef<HTMLDivElement, Omit<AnimatedBadgeProps, "children">>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedBadge
        ref={ref}
        variant="info"
        className={className}
        {...props}
      >
        Beta
      </AnimatedBadge>
    )
  }
)
BetaBadge.displayName = "BetaBadge"

/**
 * Pro Badge - Badge with "Pro" text and glow
 */
const ProBadge = React.forwardRef<HTMLDivElement, Omit<AnimatedBadgeProps, "children">>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedBadge
        ref={ref}
        variant="default"
        glow
        className={cn("bg-gradient-to-r from-yellow-500 to-orange-500 border-none", className)}
        {...props}
      >
        ⭐ Pro
      </AnimatedBadge>
    )
  }
)
ProBadge.displayName = "ProBadge"

/**
 * Trending Badge - Badge with trending indicator
 */
const TrendingBadge = React.forwardRef<HTMLDivElement, Omit<AnimatedBadgeProps, "children">>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedBadge
        ref={ref}
        variant="success"
        className={cn("gap-1", className)}
        {...props}
      >
        <motion.span
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          📈
        </motion.span>
        Trending
      </AnimatedBadge>
    )
  }
)
TrendingBadge.displayName = "TrendingBadge"

/**
 * Loading Badge - Badge with loading state
 */
const LoadingBadge = React.forwardRef<HTMLDivElement, Omit<AnimatedBadgeProps, "children">>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedBadge
        ref={ref}
        variant="secondary"
        className={cn("gap-1.5", className)}
        {...props}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
        Loading...
      </AnimatedBadge>
    )
  }
)
LoadingBadge.displayName = "LoadingBadge"

export {
  AnimatedBadge,
  CountBadge,
  StatusBadge,
  NewBadge,
  BetaBadge,
  ProBadge,
  TrendingBadge,
  LoadingBadge,
  badgeVariants,
}
