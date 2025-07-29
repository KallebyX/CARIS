"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Trophy, 
  Target, 
  CheckCircle, 
  Clock,
  Star,
  Zap,
  BookOpen,
  Brain,
} from "lucide-react"

interface Challenge {
  id: number
  title: string
  description: string
  icon: string
  type: string
  target: number
  xpReward: number
  pointsReward: number
  startDate: string
  endDate: string
  userProgress: number
  progressPercentage: number
  completed: boolean
  completedAt?: string | null
}

interface ChallengeWidgetProps {
  challenges: Challenge[]
  onUpdateProgress?: (challengeId: number, progress: number) => void
  className?: string
}

const iconMap = {
  Calendar,
  Trophy,
  Target,
  CheckCircle,
  Clock,
  Star,
  Zap,
  BookOpen,
  Brain,
}

export function ChallengeWidget({ 
  challenges, 
  onUpdateProgress,
  className = "" 
}: ChallengeWidgetProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

  const getTypeColor = (type: string) => {
    const colors = {
      diary: "bg-green-500",
      meditation: "bg-blue-500", 
      tasks: "bg-purple-500",
      streak: "bg-orange-500",
      sessions: "bg-pink-500",
    }
    return colors[type as keyof typeof colors] || "bg-gray-500"
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      diary: "Diário",
      meditation: "Meditação",
      tasks: "Tarefas", 
      streak: "Sequência",
      sessions: "Sessões",
    }
    return labels[type as keyof typeof labels] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  const getDaysRemaining = (endDate: string) => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const activeChallenges = challenges.filter(c => !c.completed)
  const completedChallenges = challenges.filter(c => c.completed)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Desafios Ativos */}
      {activeChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Desafios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeChallenges.map((challenge) => {
              const IconComponent = iconMap[challenge.icon as keyof typeof iconMap] || Target
              const daysRemaining = getDaysRemaining(challenge.endDate)
              
              return (
                <div
                  key={challenge.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedChallenge(challenge)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`${getTypeColor(challenge.type)} p-2 rounded-lg`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{challenge.title}</h3>
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(challenge.type)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Progresso: {challenge.userProgress} / {challenge.target}
                      </span>
                      <span className="font-medium">{challenge.progressPercentage}%</span>
                    </div>
                    <Progress value={challenge.progressPercentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{challenge.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span>{challenge.pointsReward} pontos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Último dia!"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Desafios Completados */}
      {completedChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Desafios Completados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedChallenges.slice(0, 3).map((challenge) => {
              const IconComponent = iconMap[challenge.icon as keyof typeof iconMap] || Target
              
              return (
                <div
                  key={challenge.id}
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="bg-green-500 p-2 rounded-lg">
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{challenge.title}</h4>
                    <p className="text-sm text-gray-600">
                      Completado em {challenge.completedAt ? formatDate(challenge.completedAt) : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-green-600 font-medium">+{challenge.xpReward} XP</div>
                    <div className="text-gray-500">+{challenge.pointsReward} pts</div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há desafios */}
      {challenges.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-800 mb-2">Nenhum desafio ativo</h3>
            <p className="text-gray-600">Novos desafios semanais serão criados em breve!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}