"use client"

import * as React from "react"
import { motion, MotionProps } from "framer-motion"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants as baseButtonVariants } from "@/lib/animation-utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:from-primary/90 hover:to-purple-600/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface AnimatedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows loading spinner and disables button */
  isLoading?: boolean
  /** Text to announce to screen readers when loading */
  loadingText?: string
  /** Icon to display before children */
  leftIcon?: React.ReactNode
  /** Icon to display after children */
  rightIcon?: React.ReactNode
  /** Animation type */
  animationType?: "scale" | "lift" | "glow" | "ripple" | "none"
  /** Custom motion props */
  motionProps?: MotionProps
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    disabled,
    children,
    type = "button",
    animationType = "scale",
    motionProps,
    "aria-label": ariaLabel,
    ...props
  }, ref) => {
    // Determine if button has accessible label
    const hasAccessibleLabel = ariaLabel || (typeof children === 'string' && children.length > 0)

    // For icon-only buttons, ensure aria-label is provided
    if (size === "icon" && !hasAccessibleLabel && !asChild) {
      console.warn('Icon buttons should have an aria-label for accessibility')
    }

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : leftIcon ? (
          <span aria-hidden="true">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span aria-hidden="true">{rightIcon}</span>
        ) : null}
      </>
    )

    const getAnimationProps = (): MotionProps => {
      if (animationType === "none" || disabled || isLoading) {
        return {}
      }

      switch (animationType) {
        case "scale":
          return {
            whileHover: { scale: 1.02 },
            whileTap: { scale: 0.98 },
            transition: { duration: 0.2 },
          }
        case "lift":
          return {
            whileHover: { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
            whileTap: { y: 0 },
            transition: { duration: 0.2 },
          }
        case "glow":
          return {
            whileHover: {
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
              scale: 1.02,
            },
            whileTap: { scale: 0.98 },
            transition: { duration: 0.2 },
          }
        case "ripple":
          return {
            whileTap: { scale: 0.95 },
            transition: { duration: 0.1 },
          }
        default:
          return {}
      }
    }

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          aria-label={ariaLabel}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...getAnimationProps()}
        {...motionProps}
        {...props}
      >
        {content}
        {isLoading && (
          <span className="sr-only">
            {loadingText || 'Loading...'}
          </span>
        )}
      </motion.button>
    )
  }
)
AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton, buttonVariants }

/**
 * Pulse Button - Button with pulsing animation
 */
interface PulseButtonProps extends AnimatedButtonProps {
  pulse?: boolean
}

export const PulseButton = React.forwardRef<HTMLButtonElement, PulseButtonProps>(
  ({ pulse = true, className, ...props }, ref) => {
    return (
      <AnimatedButton
        ref={ref}
        className={className}
        motionProps={
          pulse
            ? {
                animate: {
                  scale: [1, 1.05, 1],
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
            : undefined
        }
        {...props}
      />
    )
  }
)
PulseButton.displayName = "PulseButton"

/**
 * Bounce Button - Button that bounces on hover
 */
export const BounceButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedButton
        ref={ref}
        className={className}
        motionProps={{
          whileHover: {
            y: [0, -5, 0],
            transition: {
              duration: 0.3,
              ease: "easeInOut",
            },
          },
          whileTap: { scale: 0.95 },
        }}
        {...props}
      />
    )
  }
)
BounceButton.displayName = "BounceButton"

/**
 * Shake Button - Button that shakes (useful for errors or attention)
 */
interface ShakeButtonProps extends AnimatedButtonProps {
  shake?: boolean
}

export const ShakeButton = React.forwardRef<HTMLButtonElement, ShakeButtonProps>(
  ({ shake = false, className, ...props }, ref) => {
    return (
      <AnimatedButton
        ref={ref}
        className={className}
        motionProps={
          shake
            ? {
                animate: {
                  x: [0, -10, 10, -10, 10, 0],
                },
                transition: {
                  duration: 0.4,
                },
              }
            : undefined
        }
        {...props}
      />
    )
  }
)
ShakeButton.displayName = "ShakeButton"

/**
 * Float Button - Floating action button with shadow
 */
export const FloatButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <AnimatedButton
        ref={ref}
        className={cn("rounded-full shadow-lg", className)}
        motionProps={{
          animate: {
            y: [0, -5, 0],
          },
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
          whileHover: {
            scale: 1.1,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          },
          whileTap: { scale: 0.95 },
        }}
        {...props}
      />
    )
  }
)
FloatButton.displayName = "FloatButton"
