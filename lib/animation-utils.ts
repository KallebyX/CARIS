/**
 * Animation Utilities for CÁRIS Platform
 *
 * This module provides reusable Framer Motion variants and animation configurations
 * for consistent, performant animations throughout the application.
 *
 * Performance Considerations:
 * - Uses CSS transforms for GPU acceleration
 * - Respects prefers-reduced-motion user preference
 * - Optimized for 60fps performance
 */

import { Variants, Transition } from "framer-motion"

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Get appropriate transition based on user preference
 */
export const getTransition = (transition: Transition): Transition => {
  if (prefersReducedMotion()) {
    return { duration: 0.01 }
  }
  return transition
}

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  /** Fast transition for small UI elements */
  fast: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
  },

  /** Standard transition for most animations */
  standard: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
  },

  /** Smooth transition for large movements */
  smooth: {
    type: "spring" as const,
    stiffness: 100,
    damping: 20,
  },

  /** Bouncy transition for playful elements */
  bouncy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 15,
  },

  /** Tween transition for linear movements */
  tween: {
    type: "tween" as const,
    duration: 0.3,
    ease: "easeInOut" as const,
  },
}

// ============================================================================
// FADE VARIANTS
// ============================================================================

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.standard,
  },
}

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
}

export const fadeInDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
}

export const fadeInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.standard,
  },
}

export const fadeInRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.standard,
  },
}

// ============================================================================
// SLIDE VARIANTS
// ============================================================================

export const slideUpVariants: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    y: "100%",
    transition: transitions.smooth,
  },
}

export const slideDownVariants: Variants = {
  hidden: { y: "-100%" },
  visible: {
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    y: "-100%",
    transition: transitions.smooth,
  },
}

export const slideLeftVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    x: "-100%",
    transition: transitions.smooth,
  },
}

export const slideRightVariants: Variants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    x: "100%",
    transition: transitions.smooth,
  },
}

// ============================================================================
// SCALE VARIANTS
// ============================================================================

export const scaleVariants: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: transitions.bouncy,
  },
  exit: {
    scale: 0,
    transition: transitions.fast,
  },
}

export const scaleInVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: transitions.standard,
  },
}

export const scaleOutVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: transitions.fast,
  },
}

export const popVariants: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: [0, 1.1, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.6, 1],
    },
  },
}

// ============================================================================
// BOUNCE VARIANTS
// ============================================================================

export const bounceVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 10,
    },
  },
}

export const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// ============================================================================
// ROTATION VARIANTS
// ============================================================================

export const rotateVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
    },
  },
}

export const wiggleVariants: Variants = {
  animate: {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
    },
  },
}

export const shakeVariants: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
    },
  },
}

// ============================================================================
// STAGGER VARIANTS
// ============================================================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
}

export const staggerFastContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
}

export const staggerSlowContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
}

// ============================================================================
// PAGE TRANSITION VARIANTS
// ============================================================================

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
}

export const pageFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

export const pageSlideVariants: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: transitions.smooth,
  },
}

// ============================================================================
// LOADING VARIANTS
// ============================================================================

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

export const dotsVariants = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  },
  dot: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
}

// ============================================================================
// SUCCESS/ERROR FEEDBACK VARIANTS
// ============================================================================

export const successVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
    rotate: -180,
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
    },
  },
}

export const errorVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: transitions.bouncy,
  },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
    },
  },
}

export const checkmarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", duration: 0.6, bounce: 0 },
      opacity: { duration: 0.01 },
    },
  },
}

// ============================================================================
// INTERACTION VARIANTS
// ============================================================================

export const tapVariants: Variants = {
  tap: { scale: 0.95 },
}

export const hoverVariants: Variants = {
  hover: { scale: 1.05 },
}

export const hoverGlowVariants: Variants = {
  hover: {
    scale: 1.02,
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
  },
}

export const buttonVariants: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
}

export const cardVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  hover: {
    y: -4,
    boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
    transition: transitions.standard,
  },
}

// ============================================================================
// BADGE/NOTIFICATION VARIANTS
// ============================================================================

export const badgePulseVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0.7)",
      "0 0 0 10px rgba(59, 130, 246, 0)",
      "0 0 0 0 rgba(59, 130, 246, 0)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

export const notificationSlideVariants: Variants = {
  initial: {
    x: "100%",
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: transitions.bouncy,
  },
  exit: {
    x: "100%",
    opacity: 0,
    scale: 0.8,
    transition: transitions.fast,
  },
}

// ============================================================================
// CHART/DATA VISUALIZATION VARIANTS
// ============================================================================

export const chartBarVariants: Variants = {
  hidden: {
    scaleY: 0,
    originY: 1,
  },
  visible: (i: number) => ({
    scaleY: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
}

export const chartLineVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1, ease: "easeInOut" },
      opacity: { duration: 0.01 },
    },
  },
}

// ============================================================================
// MODAL/DIALOG VARIANTS
// ============================================================================

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: transitions.fast,
  },
}

// ============================================================================
// ACCORDION VARIANTS
// ============================================================================

export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: transitions.fast,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: transitions.standard,
  },
}

// ============================================================================
// DRAWER VARIANTS
// ============================================================================

export const drawerVariants = {
  bottom: {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: transitions.smooth,
    },
    exit: {
      y: "100%",
      transition: transitions.smooth,
    },
  },
  top: {
    hidden: { y: "-100%" },
    visible: {
      y: 0,
      transition: transitions.smooth,
    },
    exit: {
      y: "-100%",
      transition: transitions.smooth,
    },
  },
  left: {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: transitions.smooth,
    },
    exit: {
      x: "-100%",
      transition: transitions.smooth,
    },
  },
  right: {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: transitions.smooth,
    },
    exit: {
      x: "100%",
      transition: transitions.smooth,
    },
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a custom stagger container with configurable timing
 */
export const createStaggerContainer = (
  staggerDelay: number = 0.1,
  delayChildren: number = 0
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
})

/**
 * Create a custom delay animation
 */
export const createDelayedAnimation = (
  delay: number,
  variants: Variants
): Variants => ({
  ...variants,
  visible: {
    ...variants.visible,
    transition: {
      ...(variants.visible as any)?.transition,
      delay,
    },
  },
})

/**
 * Combine multiple variants
 */
export const combineVariants = (...variants: Variants[]): Variants => {
  return variants.reduce((acc, variant) => ({
    ...acc,
    ...variant,
  }), {})
}
