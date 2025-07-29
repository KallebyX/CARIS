"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Star, Trophy, Zap, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"

interface GamificationSummaryProps {
  className?: string
}

export function GamificationSummary({ className = "" }: GamificationSummaryProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGamificationData()
  }, [])

  const fetchGamificationData = async () => {
    try {
      const [pointsRes, achievementsRes, challengesRes] = await Promise.all([
        fetch("/api/gamification/points"),
        fetch("/api/gamification/achievements"),
        fetch("/api/gamification/challenges"),
      ])

      const pointsData = pointsRes.ok ? await pointsRes.json() : null
      const achievementsData = achievementsRes.ok ? await achievementsRes.json() : null
      const challengesData = challengesRes.ok ? await challengesRes.json() : null

      setData({
        points: pointsData?.data,
        achievements: achievementsData?.data,
        challenges: challengesData?.data,
      })
    } catch (error) {
      console.error("Error fetching gamification data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getLevelColor = (level: number) => {
    if (level >= 50) return "from-purple-500 to-pink-500"
    if (level >= 25) return "from-blue-500 to-cyan-500"
    if (level >= 10) return "from-green-500 to-emerald-500"
    if (level >= 5) return "from-yellow-500 to-orange-500"
    return "from-gray-400 to-gray-500"
  }

  const getLevelTitle = (level: number) => {
    if (level >= 50) return "Mestre"
    if (level >= 25) return "Especialista"
    if (level >= 10) return "Experiente"
    if (level >= 5) return "Intermediário"
    return "Iniciante"
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-caris-teal mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Carregando gamificação...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.points) {
    return null
  }

  const progressPercentage = data.points.user.xpNeededForNextLevel > 0 
    ? Math.round((data.points.user.progressToNextLevel / (data.points.user.progressToNextLevel + data.points.user.xpNeededForNextLevel)) * 100)
    : 100

  const activeChallenge = data.challenges?.activeChallenges?.[0]
  const unlockedAchievements = data.achievements?.stats?.unlocked || 0
  const totalAchievements = data.achievements?.stats?.total || 0

  return (
    <Card className={`bg-gradient-to-br ${getLevelColor(data.points.user.currentLevel)} text-white ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            <span>Seu Progresso</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {getLevelTitle(data.points.user.currentLevel)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Level Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="opacity-90">Nível {data.points.user.currentLevel}</span>
            <span className="font-medium">{data.points.user.totalXP.toLocaleString()} XP</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-white/20"
          />
          <div className="text-xs opacity-75 mt-1">
            {data.points.user.xpNeededForNextLevel > 0 ? (
              <>Faltam {data.points.user.xpNeededForNextLevel} XP para o nível {data.points.user.currentLevel + 1}</>
            ) : (
              <>Nível máximo atual!</>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">{data.points.user.weeklyPoints}</div>
            <div className="text-xs opacity-75">Pontos desta semana</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">{unlockedAchievements}/{totalAchievements}</div>
            <div className="text-xs opacity-75">Conquistas</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">{data.points.user.streak}</div>
            <div className="text-xs opacity-75">Dias de sequência</div>
          </div>
        </div>

        {/* Active Challenge Preview */}
        {activeChallenge && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Desafio Ativo</span>
              <span className="text-xs opacity-75">{activeChallenge.progressPercentage}%</span>
            </div>
            <div className="text-sm opacity-90 mb-2">{activeChallenge.title}</div>
            <Progress 
              value={activeChallenge.progressPercentage} 
              className="h-1 bg-white/20"
            />
          </div>
        )}

        {/* CTA Button */}
        <Link href="/dashboard/progress-gamified">
          <Button 
            variant="secondary" 
            className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Ver Dashboard Completo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}