"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { TrophyIcon, StarIcon, ZapIcon, TrendingUpIcon } from "lucide-react"

interface LevelUpAnimationProps {
  /** Show animation */
  show?: boolean
  /** New level */
  level: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function LevelUpAnimation({
  show = false,
  level,
  onComplete,
  className,
}: LevelUpAnimationProps) {
  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background rays */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 bg-gradient-to-t from-yellow-500 to-transparent"
                style={{
                  height: "50%",
                  transformOrigin: "top center",
                  transform: `rotate(${i * 30}deg)`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 0.6 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.5,
                }}
              />
            ))}
          </motion.div>

          {/* Level up content */}
          <motion.div
            className="relative bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-8 shadow-2xl pointer-events-auto"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.5,
                }}
              >
                <TrophyIcon className="w-16 h-16 text-white mx-auto mb-4" />
              </motion.div>

              <motion.h2
                className="text-3xl font-bold text-white mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                LEVEL UP!
              </motion.h2>

              <motion.div
                className="flex items-center justify-center gap-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
              >
                <span className="text-5xl font-bold text-white">{level}</span>
              </motion.div>

              <motion.p
                className="text-white/90 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Keep up the great work!
              </motion.p>
            </motion.div>

            {/* Sparkles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * 100,
                  y: Math.sin((i * Math.PI * 2) / 8) * 100,
                }}
                transition={{
                  duration: 1,
                  delay: 0.8 + i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AchievementUnlockAnimationProps {
  /** Show animation */
  show?: boolean
  /** Achievement title */
  title: string
  /** Achievement description */
  description?: string
  /** Achievement icon */
  icon?: React.ReactNode
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function AchievementUnlockAnimation({
  show = false,
  title,
  description,
  icon,
  onComplete,
  className,
}: AchievementUnlockAnimationProps) {
  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn("fixed top-4 right-4 z-50", className)}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-lg shadow-2xl"
            animate={{
              boxShadow: [
                "0 0 20px rgba(168, 85, 247, 0.4)",
                "0 0 40px rgba(168, 85, 247, 0.6)",
                "0 0 20px rgba(168, 85, 247, 0.4)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <div className="bg-background rounded-lg p-4 flex items-start gap-4 min-w-[300px]">
              <motion.div
                className="flex-shrink-0"
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                {icon || <TrophyIcon className="w-10 h-10 text-yellow-500" />}
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.p
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Achievement Unlocked
                </motion.p>

                <motion.h3
                  className="font-bold text-foreground mb-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {title}
                </motion.h3>

                {description && (
                  <motion.p
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {description}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface XPGainAnimationProps {
  /** Show animation */
  show?: boolean
  /** XP amount gained */
  amount: number
  /** Position to animate from */
  position?: { x: number; y: number }
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function XPGainAnimation({
  show = false,
  amount,
  position = { x: 0, y: 0 },
  onComplete,
  className,
}: XPGainAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed pointer-events-none z-50",
            className
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -50 }}
          exit={{ opacity: 0, scale: 0.5, y: -100 }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
          onAnimationComplete={onComplete}
        >
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
            <ZapIcon className="w-4 h-4" />
            <span>+{amount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface StreakCounterAnimationProps {
  /** Current streak */
  streak: number
  /** Show animation */
  animate?: boolean
  /** Custom className */
  className?: string
}

export function StreakCounterAnimation({
  streak,
  animate = false,
  className,
}: StreakCounterAnimationProps) {
  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg",
        className
      )}
      animate={
        animate
          ? {
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0],
            }
          : {}
      }
      transition={{
        duration: 0.5,
      }}
    >
      <motion.div
        animate={
          animate
            ? {
                rotate: [0, 360],
              }
            : {}
        }
        transition={{
          duration: 0.5,
        }}
      >
        🔥
      </motion.div>
      <span>{streak} Day Streak!</span>
    </motion.div>
  )
}

interface LeaderboardRankChangeProps {
  /** Show animation */
  show?: boolean
  /** Previous rank */
  previousRank: number
  /** New rank */
  newRank: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function LeaderboardRankChange({
  show = false,
  previousRank,
  newRank,
  onComplete,
  className,
}: LeaderboardRankChangeProps) {
  const isImprovement = newRank < previousRank
  const rankDifference = Math.abs(newRank - previousRank)

  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed bottom-4 right-4 z-50",
            className
          )}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          <div
            className={cn(
              "p-4 rounded-lg shadow-lg flex items-center gap-3",
              isImprovement
                ? "bg-green-500/10 border-2 border-green-500"
                : "bg-red-500/10 border-2 border-red-500"
            )}
          >
            <motion.div
              animate={{
                y: isImprovement ? [-5, 0, -5] : [5, 0, 5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            >
              <TrendingUpIcon
                className={cn(
                  "w-6 h-6",
                  isImprovement
                    ? "text-green-500"
                    : "text-red-500 rotate-180"
                )}
              />
            </motion.div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Rank {isImprovement ? "Up" : "Down"}
              </p>
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-2xl font-bold text-foreground"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  #{newRank}
                </motion.span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isImprovement ? "text-green-500" : "text-red-500"
                  )}
                >
                  ({isImprovement ? "+" : "-"}{rankDifference})
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ProgressMilestoneProps {
  /** Show animation */
  show?: boolean
  /** Milestone title */
  title: string
  /** Milestone description */
  description?: string
  /** Progress percentage (0-100) */
  progress: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function ProgressMilestone({
  show = false,
  title,
  description,
  progress,
  onComplete,
  className,
}: ProgressMilestoneProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            className
          )}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          onAnimationComplete={onComplete}
        >
          <div className="bg-background border-2 border-primary rounded-2xl p-8 shadow-2xl min-w-[300px]">
            <motion.div
              className="text-center mb-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <StarIcon className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-foreground">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </motion.div>

            <motion.div
              className="relative h-2 bg-secondary/20 rounded-full overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
              />
            </motion.div>

            <motion.p
              className="text-center text-sm font-medium text-muted-foreground mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {progress}% Complete
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface RewardCollectionProps {
  /** Show animation */
  show?: boolean
  /** Reward type */
  type: "coins" | "gems" | "stars" | "trophy"
  /** Amount collected */
  amount: number
  /** Callback when animation completes */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function RewardCollection({
  show = false,
  type,
  amount,
  onComplete,
  className,
}: RewardCollectionProps) {
  const icons = {
    coins: "🪙",
    gems: "💎",
    stars: "⭐",
    trophy: "🏆",
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
        >
          <motion.div
            className="bg-background/95 backdrop-blur-sm border-2 border-yellow-500 rounded-2xl p-8 shadow-2xl pointer-events-auto"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <motion.div
              className="text-6xl text-center mb-4"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              {icons[type]}
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-3xl font-bold text-foreground">
                +{amount}
              </p>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {type}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
