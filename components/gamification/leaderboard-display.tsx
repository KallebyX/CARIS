"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  Star,
  TrendingUp,
  Users,
  Calendar,
  Target
} from "lucide-react"

interface LeaderboardEntry {
  id: number
  userId: number
  score: number
  rank: number
  user: {
    id: number
    name: string
    avatarUrl?: string | null
  }
}

interface LeaderboardData {
  leaderboard: {
    id: number
    name: string
    description: string
    type: string
    category: string
  }
  entries: LeaderboardEntry[]
  userRank: number | null
  userScore: number
  totalParticipants: number
}

interface LeaderboardDisplayProps {
  data: LeaderboardData | null
  loading?: boolean
  onTypeChange?: (type: string) => void
  onCategoryChange?: (category: string) => void
  className?: string
}

export function LeaderboardDisplay({ 
  data, 
  loading = false,
  onTypeChange,
  onCategoryChange,
  className = "" 
}: LeaderboardDisplayProps) {
  const [selectedType, setSelectedType] = useState("weekly")
  const [selectedCategory, setSelectedCategory] = useState("xp")

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    onTypeChange?.(type)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    onCategoryChange?.(category)
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {rank}
          </div>
        )
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white"
      case 2:
        return "bg-gray-400 text-white"
      case 3:
        return "bg-amber-600 text-white"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreLabel = (category: string) => {
    const labels = {
      xp: "XP",
      points: "Pontos",
      streak: "Dias",
      activities: "Atividades",
    }
    return labels[category as keyof typeof labels] || "Pontos"
  }

  const formatScore = (score: number, category: string) => {
    if (category === "xp" || category === "points") {
      return score.toLocaleString()
    }
    return score.toString()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando ranking...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking da Comunidade
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedType} onValueChange={handleTypeChange}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="all_time">Todo Tempo</TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedCategory === "xp" ? "default" : "outline"}
                onClick={() => handleCategoryChange("xp")}
                className="flex items-center gap-1"
              >
                <Star className="w-3 h-3" />
                Experiência
              </Button>
              <Button
                size="sm"
                variant={selectedCategory === "points" ? "default" : "outline"}
                onClick={() => handleCategoryChange("points")}
                className="flex items-center gap-1"
              >
                <Target className="w-3 h-3" />
                Pontos
              </Button>
              <Button
                size="sm"
                variant={selectedCategory === "streak" ? "default" : "outline"}
                onClick={() => handleCategoryChange("streak")}
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Sequência
              </Button>
            </div>
          </div>

          {data && (
            <div className="space-y-4">
              {/* Estatísticas do usuário */}
              {data.userRank && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {data.userRank}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Sua Posição</p>
                        <p className="text-sm text-gray-600">
                          {formatScore(data.userScore, selectedCategory)} {getScoreLabel(selectedCategory)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{data.totalParticipants} participantes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista do ranking */}
              <div className="space-y-2">
                {data.entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border
                      ${entry.rank <= 3 ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : "bg-gray-50 border-gray-200"}
                      ${entry.userId === data.userRank ? "ring-2 ring-blue-300" : ""}
                    `}
                  >
                    {/* Posição */}
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <Badge className={`${getRankBadgeColor(entry.rank)} font-bold`}>
                        #{entry.rank}
                      </Badge>
                    </div>

                    {/* Avatar e nome */}
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={entry.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{entry.user.name}</p>
                    </div>

                    {/* Pontuação */}
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        {formatScore(entry.score, selectedCategory)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getScoreLabel(selectedCategory)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mensagem se estiver vazio */}
              {data.entries.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-800 mb-2">Ranking em construção</h3>
                  <p className="text-gray-600">Continue suas atividades para aparecer no ranking!</p>
                </div>
              )}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}