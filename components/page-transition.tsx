"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  pageVariants,
  pageFadeVariants,
  pageSlideVariants,
} from "@/lib/animation-utils"

interface PageTransitionProps {
  /** Children to animate */
  children: React.ReactNode
  /** Transition type */
  type?: "fade" | "slide" | "fadeUp" | "scale"
  /** Custom className */
  className?: string
}

export function PageTransition({
  children,
  type = "fadeUp",
  className,
}: PageTransitionProps) {
  const pathname = usePathname()

  const getVariants = () => {
    switch (type) {
      case "fade":
        return pageFadeVariants
      case "slide":
        return pageSlideVariants
      case "scale":
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
        }
      case "fadeUp":
      default:
        return pageVariants
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={getVariants()}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

interface RouteLoadingBarProps {
  /** Color of the loading bar */
  color?: string
  /** Height of the loading bar */
  height?: number
  /** Custom className */
  className?: string
}

export function RouteLoadingBar({
  color = "#3b82f6",
  height = 3,
  className,
}: RouteLoadingBarProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const pathname = usePathname()
  const previousPathname = React.useRef(pathname)

  React.useEffect(() => {
    if (pathname !== previousPathname.current) {
      setIsLoading(true)
      previousPathname.current = pathname

      // Simulate loading completion
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className={cn("fixed top-0 left-0 right-0 z-50", className)}
          style={{ height }}
          initial={{ scaleX: 0, transformOrigin: "left" }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 1, transformOrigin: "right", opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div
            className="h-full"
            style={{ backgroundColor: color }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface SmoothScrollProps {
  /** Children to wrap */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

export function SmoothScroll({ children, className }: SmoothScrollProps) {
  const pathname = usePathname()

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pathname])

  return <div className={className}>{children}</div>
}

interface PageLayoutProps {
  /** Children to render */
  children: React.ReactNode
  /** Show loading bar */
  showLoadingBar?: boolean
  /** Transition type */
  transitionType?: "fade" | "slide" | "fadeUp" | "scale"
  /** Custom className */
  className?: string
}

export function PageLayout({
  children,
  showLoadingBar = true,
  transitionType = "fadeUp",
  className,
}: PageLayoutProps) {
  return (
    <>
      {showLoadingBar && <RouteLoadingBar />}
      <PageTransition type={transitionType} className={className}>
        {children}
      </PageTransition>
    </>
  )
}

interface FadeTransitionProps {
  /** Show content */
  show?: boolean
  /** Children to animate */
  children: React.ReactNode
  /** Duration in seconds */
  duration?: number
  /** Delay in seconds */
  delay?: number
  /** Custom className */
  className?: string
}

export function FadeTransition({
  show = true,
  children,
  duration = 0.3,
  delay = 0,
  className,
}: FadeTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, delay }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface SlideTransitionProps {
  /** Show content */
  show?: boolean
  /** Children to animate */
  children: React.ReactNode
  /** Direction of slide */
  direction?: "up" | "down" | "left" | "right"
  /** Distance to slide */
  distance?: number
  /** Duration in seconds */
  duration?: number
  /** Custom className */
  className?: string
}

export function SlideTransition({
  show = true,
  children,
  direction = "up",
  distance = 20,
  duration = 0.3,
  className,
}: SlideTransitionProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance }
      case "down":
        return { y: -distance }
      case "left":
        return { x: distance }
      case "right":
        return { x: -distance }
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ ...getInitialPosition(), opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ ...getInitialPosition(), opacity: 0 }}
          transition={{ duration, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ScaleTransitionProps {
  /** Show content */
  show?: boolean
  /** Children to animate */
  children: React.ReactNode
  /** Initial scale */
  initialScale?: number
  /** Duration in seconds */
  duration?: number
  /** Custom className */
  className?: string
}

export function ScaleTransition({
  show = true,
  children,
  initialScale = 0.9,
  duration = 0.3,
  className,
}: ScaleTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ scale: initialScale, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: initialScale, opacity: 0 }}
          transition={{ duration, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface CollapseTransitionProps {
  /** Show content */
  show?: boolean
  /** Children to animate */
  children: React.ReactNode
  /** Duration in seconds */
  duration?: number
  /** Custom className */
  className?: string
}

export function CollapseTransition({
  show = true,
  children,
  duration = 0.3,
  className,
}: CollapseTransitionProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface StaggerChildrenProps {
  /** Children to stagger */
  children: React.ReactNode
  /** Stagger delay between children (seconds) */
  staggerDelay?: number
  /** Initial delay before first child (seconds) */
  initialDelay?: number
  /** Custom className */
  className?: string
}

export function StaggerChildren({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  className,
}: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  /** Children to animate */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

interface ModalTransitionProps {
  /** Show modal */
  show?: boolean
  /** Children to animate */
  children: React.ReactNode
  /** Show backdrop */
  showBackdrop?: boolean
  /** Callback when backdrop is clicked */
  onBackdropClick?: () => void
  /** Custom className */
  className?: string
  /** Backdrop className */
  backdropClassName?: string
}

export function ModalTransition({
  show = false,
  children,
  showBackdrop = true,
  onBackdropClick,
  className,
  backdropClassName,
}: ModalTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              className={cn(
                "fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
                backdropClassName
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onBackdropClick}
            />
          )}

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className={cn("pointer-events-auto", className)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
