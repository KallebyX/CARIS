"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Crown, Sparkles, X } from "lucide-react"

interface LevelUpNotificationProps {
  show: boolean
  newLevel: number
  xpEarned: number
  onClose: () => void
}

export function LevelUpNotification({ 
  show, 
  newLevel, 
  xpEarned, 
  onClose 
}: LevelUpNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  const getLevelTitle = (level: number) => {
    if (level >= 50) return "Mestre"
    if (level >= 25) return "Especialista"
    if (level >= 10) return "Experiente"
    if (level >= 5) return "Intermediário"
    return "Iniciante"
  }

  const getLevelColor = (level: number) => {
    if (level >= 50) return "from-purple-500 to-pink-500"
    if (level >= 25) return "from-blue-500 to-cyan-500"
    if (level >= 10) return "from-green-500 to-emerald-500"
    if (level >= 5) return "from-yellow-500 to-orange-500"
    return "from-gray-400 to-gray-500"
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -100 }}
          transition={{ 
            type: "spring", 
            duration: 0.6,
            stiffness: 200,
            damping: 20
          }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="w-96 bg-white border-2 border-yellow-300 shadow-2xl overflow-hidden">
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getLevelColor(newLevel)} opacity-10`} />
            
            {/* Sparkle effects */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, rotate: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </motion.div>
              ))}
            </div>

            <CardContent className="relative p-6 text-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsVisible(false)
                  onClose()
                }}
                className="absolute top-2 right-2 w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Level up animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  duration: 0.8, 
                  delay: 0.3,
                  stiffness: 150
                }}
                className="mb-4"
              >
                <div className={`
                  w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getLevelColor(newLevel)}
                  flex items-center justify-center shadow-lg
                `}>
                  <Crown className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              {/* Level up text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Parabéns! 🎉
                </h2>
                <p className="text-lg text-gray-700 mb-4">
                  Você subiu para o nível <strong>{newLevel}</strong>!
                </p>
              </motion.div>

              {/* Level badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  delay: 0.7, 
                  duration: 0.5,
                  stiffness: 200
                }}
                className="mb-4"
              >
                <Badge 
                  className={`
                    text-white px-4 py-2 text-lg font-bold
                    bg-gradient-to-r ${getLevelColor(newLevel)}
                  `}
                >
                  {getLevelTitle(newLevel)} - Nível {newLevel}
                </Badge>
              </motion.div>

              {/* XP earned */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="flex items-center justify-center gap-2 text-gray-600 mb-4"
              >
                <Star className="w-5 h-5 text-yellow-500" />
                <span>+{xpEarned} XP ganhos</span>
              </motion.div>

              {/* Motivational message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="text-sm text-gray-600"
              >
                Continue sua jornada de crescimento! 💪
              </motion.p>

              {/* Continue button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="mt-4"
              >
                <Button
                  onClick={() => {
                    setIsVisible(false)
                    onClose()
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Continuar
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook para usar notificações de level up
export function useLevelUpNotification() {
  const [notification, setNotification] = useState<{
    show: boolean
    newLevel: number
    xpEarned: number
  }>({
    show: false,
    newLevel: 1,
    xpEarned: 0,
  })

  const showLevelUp = (newLevel: number, xpEarned: number) => {
    setNotification({
      show: true,
      newLevel,
      xpEarned,
    })
  }

  const hideLevelUp = () => {
    setNotification(prev => ({ ...prev, show: false }))
  }

  return {
    notification,
    showLevelUp,
    hideLevelUp,
  }
}