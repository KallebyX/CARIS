"use client"

import * as React from "react"
import { motion, MotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { cardVariants } from "@/lib/animation-utils"

const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Enable hover animation */
    hover?: boolean
    /** Animation delay in seconds */
    delay?: number
    /** Custom motion props */
    motionProps?: MotionProps
  }
>(({ className, hover = true, delay = 0, motionProps, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    variants={hover ? cardVariants : undefined}
    whileHover={hover ? "hover" : undefined}
    {...motionProps}
    {...props}
  />
))
AnimatedCard.displayName = "AnimatedCard"

const AnimatedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
AnimatedCardHeader.displayName = "AnimatedCardHeader"

const AnimatedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    /** Animate title on mount */
    animate?: boolean
  }
>(({ className, animate = true, children, ...props }, ref) => {
  if (!animate) {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    )
  }

  return (
    <motion.h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.h3>
  )
})
AnimatedCardTitle.displayName = "AnimatedCardTitle"

const AnimatedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    /** Animate description on mount */
    animate?: boolean
  }
>(({ className, animate = true, children, ...props }, ref) => {
  if (!animate) {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      >
        {children}
      </p>
    )
  }

  return (
    <motion.p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.p>
  )
})
AnimatedCardDescription.displayName = "AnimatedCardDescription"

const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("p-6 pt-0", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.3 }}
    {...props}
  />
))
AnimatedCardContent.displayName = "AnimatedCardContent"

const AnimatedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.3 }}
    {...props}
  />
))
AnimatedCardFooter.displayName = "AnimatedCardFooter"

/**
 * Interactive Card - Card with enhanced interactions
 */
interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable click to expand */
  expandable?: boolean
  /** Enable tilt effect on hover */
  tilt?: boolean
  /** Custom motion props */
  motionProps?: MotionProps
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, expandable = false, tilt = false, motionProps, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false)

    const getTiltProps = (): MotionProps => {
      if (!tilt) return {}

      return {
        whileHover: {
          rotateX: 5,
          rotateY: 5,
          transformPerspective: 1000,
          transition: { duration: 0.3 },
        },
      }
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer",
          className
        )}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
        animate={{
          scale: isExpanded ? 1.05 : 1,
        }}
        whileHover={{
          y: -4,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.3 }}
        {...getTiltProps()}
        {...motionProps}
        {...props}
      />
    )
  }
)
InteractiveCard.displayName = "InteractiveCard"

/**
 * Flip Card - Card that flips on click
 */
interface FlipCardProps {
  /** Front content */
  front: React.ReactNode
  /** Back content */
  back: React.ReactNode
  /** Custom className */
  className?: string
}

const FlipCard = React.forwardRef<HTMLDivElement, FlipCardProps>(
  ({ front, back, className }, ref) => {
    const [isFlipped, setIsFlipped] = React.useState(false)

    return (
      <div
        ref={ref}
        className={cn("relative h-full w-full cursor-pointer", className)}
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            {front}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {back}
          </div>
        </motion.div>
      </div>
    )
  }
)
FlipCard.displayName = "FlipCard"

/**
 * Glassmorphism Card - Card with glass effect
 */
const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "rounded-lg backdrop-blur-md bg-white/10 dark:bg-black/10 border border-white/20 shadow-lg",
      className
    )}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{
      scale: 1.02,
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    }}
    transition={{ duration: 0.3 }}
    {...props}
  />
))
GlassCard.displayName = "GlassCard"

/**
 * Gradient Border Card - Card with animated gradient border
 */
const GradientBorderCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("relative p-[2px] rounded-lg", className)}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.3 }}
    {...props}
  >
    <motion.div
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        backgroundSize: "200% 200%",
      }}
    />
    <div className="relative bg-background rounded-lg h-full">
      {children}
    </div>
  </motion.div>
))
GradientBorderCard.displayName = "GradientBorderCard"

export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter,
  InteractiveCard,
  FlipCard,
  GlassCard,
  GradientBorderCard,
}
