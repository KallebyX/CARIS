"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp } from "lucide-react"

interface XPProgressBarProps {
  currentXP: number
  currentLevel: number
  progressToNextLevel: number
  xpNeededForNextLevel: number
  className?: string
}

export function XPProgressBar({
  currentXP,
  currentLevel,
  progressToNextLevel,
  xpNeededForNextLevel,
  className = "",
}: XPProgressBarProps) {
  const progressPercentage = xpNeededForNextLevel > 0 
    ? Math.round((progressToNextLevel / (progressToNextLevel + xpNeededForNextLevel)) * 100)
    : 100

  const getLevelColor = (level: number) => {
    if (level >= 50) return "bg-purple-500 text-white"
    if (level >= 25) return "bg-blue-500 text-white"
    if (level >= 10) return "bg-green-500 text-white"
    if (level >= 5) return "bg-yellow-500 text-black"
    return "bg-gray-500 text-white"
  }

  const getLevelTitle = (level: number) => {
    if (level >= 50) return "Mestre"
    if (level >= 25) return "Especialista"
    if (level >= 10) return "Experiente"
    if (level >= 5) return "Intermediário"
    return "Iniciante"
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-gray-800">Nível de Progresso</span>
        </div>
        <Badge className={`${getLevelColor(currentLevel)} font-bold`}>
          Nível {currentLevel}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{getLevelTitle(currentLevel)}</span>
          <span className="text-gray-600">
            {currentXP.toLocaleString()} XP
          </span>
        </div>
        
        <Progress 
          value={progressPercentage} 
          className="h-3 bg-gray-100"
        />
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{progressToNextLevel} / {progressToNextLevel + xpNeededForNextLevel} XP</span>
          </div>
          <span>
            {xpNeededForNextLevel > 0 ? (
              <>Faltam {xpNeededForNextLevel.toLocaleString()} XP para o nível {currentLevel + 1}</>
            ) : (
              <>Nível máximo atual!</>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}