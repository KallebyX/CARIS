"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Award, 
  Star, 
  Crown, 
  Gem, 
  BookOpen, 
  Brain, 
  CheckCircle, 
  Calendar, 
  Heart,
  Target,
  Trophy,
  Zap
} from "lucide-react"

interface AchievementBadgeProps {
  achievement: {
    id: number
    name: string
    description: string
    icon: string
    rarity: string
    unlocked: boolean
    unlockedAt?: string | null
    xpReward: number
    category: string
  }
  size?: "sm" | "md" | "lg"
  showUnlockAnimation?: boolean
  onClick?: () => void
}

const iconMap = {
  BookOpen,
  Brain, 
  CheckCircle,
  Calendar,
  Heart,
  Target,
  Trophy,
  Award,
  Star,
  Crown,
  Gem,
  Zap,
}

export function AchievementBadge({ 
  achievement, 
  size = "md", 
  showUnlockAnimation = false,
  onClick 
}: AchievementBadgeProps) {
  const IconComponent = iconMap[achievement.icon as keyof typeof iconMap] || Award

  const sizeClasses = {
    sm: "w-16 h-20 p-2",
    md: "w-20 h-24 p-3", 
    lg: "w-24 h-28 p-4",
  }

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  const getRarityColor = (rarity: string, unlocked: boolean) => {
    const colors = {
      common: unlocked ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200",
      rare: unlocked ? "bg-blue-100 border-blue-300" : "bg-blue-50 border-blue-200", 
      epic: unlocked ? "bg-purple-100 border-purple-300" : "bg-purple-50 border-purple-200",
      legendary: unlocked ? "bg-yellow-100 border-yellow-300" : "bg-yellow-50 border-yellow-200",
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const getRarityIconColor = (rarity: string, unlocked: boolean) => {
    if (!unlocked) return "text-gray-400"
    
    const colors = {
      common: "text-gray-600",
      rare: "text-blue-600",
      epic: "text-purple-600", 
      legendary: "text-yellow-600",
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const getRarityBadgeColor = (rarity: string) => {
    const colors = {
      common: "bg-gray-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500 text-black",
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <motion.div
      initial={showUnlockAnimation ? { scale: 0, rotate: -180 } : false}
      animate={showUnlockAnimation ? { scale: 1, rotate: 0 } : {}}
      transition={{ type: "spring", duration: 0.6 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        className={`
          ${sizeClasses[size]} 
          ${getRarityColor(achievement.rarity, achievement.unlocked)}
          border-2 rounded-lg flex flex-col items-center justify-center gap-1
          hover:shadow-md transition-all duration-200
          ${!achievement.unlocked ? "opacity-60" : ""}
          relative overflow-hidden
        `}
        onClick={onClick}
      >
        {/* Efeito de brilho para conquistas desbloqueadas */}
        {achievement.unlocked && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        )}

        {/* Ícone da conquista */}
        <div className={`
          ${achievement.unlocked ? "bg-white/50" : "bg-gray-100"} 
          rounded-full p-2 mb-1
        `}>
          <IconComponent 
            className={`${iconSizes[size]} ${getRarityIconColor(achievement.rarity, achievement.unlocked)}`} 
          />
        </div>

        {/* Nome da conquista */}
        <span className={`
          text-xs font-medium text-center leading-tight
          ${achievement.unlocked ? "text-gray-800" : "text-gray-500"}
        `}>
          {achievement.name}
        </span>

        {/* Badge de raridade */}
        <Badge 
          className={`
            ${getRarityBadgeColor(achievement.rarity)} 
            text-xs px-1 py-0 text-white
          `}
        >
          {achievement.rarity}
        </Badge>

        {/* Data de desbloqueio */}
        {achievement.unlocked && achievement.unlockedAt && (
          <span className="text-xs text-gray-500 mt-1">
            {formatDate(achievement.unlockedAt)}
          </span>
        )}

        {/* XP Reward */}
        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
          <Star className="w-3 h-3 text-yellow-500" />
          <span>{achievement.xpReward} XP</span>
        </div>
      </Button>
    </motion.div>
  )
}