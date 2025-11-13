"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Confetti } from "./confetti"

interface CelebrationProps {
  /** Show celebration */
  show?: boolean
  /** Auto-hide after milliseconds */
  duration?: number
  /** Callback when celebration ends */
  onComplete?: () => void
  /** Type of celebration */
  type?: "confetti" | "fireworks" | "sparkles"
  /** Custom className */
  className?: string
}

export function Celebration({
  show = false,
  duration = 5000,
  onComplete,
  type = "confetti",
  className,
}: CelebrationProps) {
  const [isActive, setIsActive] = React.useState(show)

  React.useEffect(() => {
    setIsActive(show)

    if (show && duration) {
      const timer = setTimeout(() => {
        setIsActive(false)
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onComplete])

  if (!isActive) return null

  return (
    <AnimatePresence>
      {type === "confetti" && <Confetti />}
      {type === "fireworks" && <Fireworks className={className} />}
      {type === "sparkles" && <Sparkles className={className} />}
    </AnimatePresence>
  )
}

interface FireworksProps {
  className?: string
}

function Fireworks({ className }: FireworksProps) {
  const [bursts, setBursts] = React.useState<Array<{ id: number; x: number; y: number }>>([])

  React.useEffect(() => {
    const createBurst = () => {
      const id = Date.now()
      const x = Math.random() * window.innerWidth
      const y = Math.random() * (window.innerHeight / 2)

      setBursts(prev => [...prev, { id, x, y }])

      setTimeout(() => {
        setBursts(prev => prev.filter(b => b.id !== id))
      }, 1000)
    }

    // Create multiple bursts
    const intervals: NodeJS.Timeout[] = []
    for (let i = 0; i < 5; i++) {
      const interval = setInterval(createBurst, 500 + i * 300)
      intervals.push(interval)
    }

    return () => {
      intervals.forEach(clearInterval)
    }
  }, [])

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 overflow-hidden ${className}`}>
      <AnimatePresence>
        {bursts.map(burst => (
          <FireworkBurst key={burst.id} x={burst.x} y={burst.y} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface FireworkBurstProps {
  x: number
  y: number
}

function FireworkBurst({ x, y }: FireworkBurstProps) {
  const particles = Array.from({ length: 30 })
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]

  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {particles.map((_, i) => {
        const angle = (Math.PI * 2 * i) / particles.length
        const velocity = 50 + Math.random() * 50
        const color = colors[Math.floor(Math.random() * colors.length)]

        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * velocity,
              y: Math.sin(angle) * velocity - 50,
              opacity: 0,
              scale: [1, 1.5, 0],
            }}
            transition={{
              duration: 1,
              ease: "easeOut",
            }}
          />
        )
      })}
    </div>
  )
}

interface SparklesProps {
  className?: string
}

function Sparkles({ className }: SparklesProps) {
  const [sparkles, setSparkles] = React.useState<Array<{
    id: number
    x: number
    y: number
    size: number
  }>>([])

  React.useEffect(() => {
    const createSparkle = () => {
      const id = Date.now() + Math.random()
      const x = Math.random() * window.innerWidth
      const y = Math.random() * window.innerHeight
      const size = 4 + Math.random() * 8

      setSparkles(prev => [...prev, { id, x, y, size }])

      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== id))
      }, 1000)
    }

    const interval = setInterval(createSparkle, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 overflow-hidden ${className}`}>
      <AnimatePresence>
        {sparkles.map(sparkle => (
          <motion.div
            key={sparkle.id}
            className="absolute"
            style={{
              left: sparkle.x,
              top: sparkle.y,
            }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 180 }}
            exit={{ scale: 0, rotate: 360, opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <svg width={sparkle.size} height={sparkle.size} viewBox="0 0 24 24">
              <path
                d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                fill="currentColor"
                className="text-yellow-400"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface SuccessCelebrationProps {
  /** Show celebration */
  show?: boolean
  /** Success message */
  message?: string
  /** Callback when completed */
  onComplete?: () => void
  /** Custom className */
  className?: string
}

export function SuccessCelebration({
  show = false,
  message = "Success!",
  onComplete,
  className,
}: SuccessCelebrationProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <Celebration show={show} onComplete={onComplete} type="confetti" />
          <motion.div
            className={`fixed inset-0 flex items-center justify-center pointer-events-none z-50 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background/95 backdrop-blur-sm border-2 border-green-500 rounded-lg p-8 shadow-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="text-6xl mb-4 text-center"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: 3,
                  ease: "easeInOut",
                }}
              >
                🎉
              </motion.div>
              <motion.p
                className="text-2xl font-bold text-green-600 dark:text-green-400 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {message}
              </motion.p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface AchievementUnlockProps {
  /** Show achievement */
  show?: boolean
  /** Achievement title */
  title: string
  /** Achievement description */
  description?: string
  /** Achievement icon */
  icon?: string
  /** Duration to show (ms) */
  duration?: number
  /** Callback when closed */
  onClose?: () => void
  /** Custom className */
  className?: string
}

export function AchievementUnlock({
  show = false,
  title,
  description,
  icon = "🏆",
  duration = 5000,
  onClose,
  className,
}: AchievementUnlockProps) {
  React.useEffect(() => {
    if (show && duration && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Background effect */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />
          </motion.div>

          {/* Achievement card */}
          <motion.div
            className={`fixed top-4 right-4 z-50 ${className}`}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-lg shadow-2xl"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(234, 179, 8, 0.3)",
                  "0 0 40px rgba(234, 179, 8, 0.6)",
                  "0 0 20px rgba(234, 179, 8, 0.3)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <div className="bg-background rounded-lg p-4 flex items-start gap-4">
                <motion.div
                  className="text-4xl"
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
                  {icon}
                </motion.div>
                <div className="flex-1">
                  <motion.p
                    className="font-bold text-sm text-yellow-600 dark:text-yellow-400 mb-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    ACHIEVEMENT UNLOCKED
                  </motion.p>
                  <motion.h3
                    className="font-bold text-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {title}
                  </motion.h3>
                  {description && (
                    <motion.p
                      className="text-sm text-muted-foreground mt-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {description}
                    </motion.p>
                  )}
                </div>
                {onClose && (
                  <motion.button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ✕
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Sparkles effect */}
          <Sparkles />
        </>
      )}
    </AnimatePresence>
  )
}
