"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, CheckCircle, Heart, Calendar, TrendingUp, Clock, Target, Star, Award, Zap } from "lucide-react"
import { EmotionalMap } from "@/components/emotional-map"
import { XPProgressBar } from "@/components/gamification/xp-progress-bar"
import { AchievementBadge } from "@/components/gamification/achievement-badge"
import { ChallengeWidget } from "@/components/gamification/challenge-widget"
import { LeaderboardDisplay } from "@/components/gamification/leaderboard-display"
import { LevelUpNotification, useLevelUpNotification } from "@/components/gamification/level-up-notification"
import { useTranslations } from "@/lib/i18n"

interface GamificationData {
  user: {
    totalXP: number
    currentLevel: number
    weeklyPoints: number
    monthlyPoints: number
    streak: number
    progressToNextLevel: number
    xpNeededForNextLevel: number
    nextLevelXP: number
  }
  recentActivities: Array<{
    id: number
    activityType: string
    points: number
    xp: number
    description: string
    createdAt: string
  }>
}

interface ProgressData {
  stats: {
    diary: { total: number; recent: number }
    tasks: { total: number; completed: number; pending: number; inProgress: number }
    sos: { total: number; recent: number; totalMinutes: number }
    sessions: { total: number; completed: number; upcoming: number }
  }
  achievements: Array<{
    id: number
    type: string
    title: string
    description: string
    unlockedAt: string
  }>
  achievementProgress: {
    firstEntry: boolean
    weekStreak: boolean
    sosUsage: boolean
    taskCompletion: boolean
    monthlyGoal: boolean
  }
  emotionalMapData: Array<{
    id: number
    mood: number
    energy: number
    anxiety: number
    date: string
    notes?: string
  }>
  recentTasks: Array<{
    id: number
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
    psychologist: { name: string }
  }>
}

export default function GamifiedProgressPage() {
  const t = useTranslations("patient.gamifiedProgressPage")
  const [data, setData] = useState<ProgressData | null>(null)
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null)
  const [achievementsData, setAchievementsData] = useState<any>(null)
  const [challengesData, setChallengesData] = useState<any>(null)
  const [leaderboardData, setLeaderboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { notification, showLevelUp, hideLevelUp } = useLevelUpNotification()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [progressRes, gamificationRes, achievementsRes, challengesRes, leaderboardRes] = await Promise.all([
        fetch("/api/patient/progress"),
        fetch("/api/gamification/points"),
        fetch("/api/gamification/achievements"),
        fetch("/api/gamification/challenges"),
        fetch("/api/gamification/leaderboard?type=weekly&category=xp")
      ])

      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setData(progressData)
      }

      if (gamificationRes.ok) {
        const gamifData = await gamificationRes.json()
        setGamificationData(gamifData.data)
      }

      if (achievementsRes.ok) {
        const achData = await achievementsRes.json()
        setAchievementsData(achData.data)
      }

      if (challengesRes.ok) {
        const challData = await challengesRes.json()
        setChallengesData(challData.data)
      }

      if (leaderboardRes.ok) {
        const leaderData = await leaderboardRes.json()
        setLeaderboardData(leaderData.data)
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch("/api/patient/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      })

      if (response.ok) {
        // Award points for completing task
        if (newStatus === "concluida") {
          await awardPoints("task_completed", { taskId })
        }
        
        // Reload data
        fetchAllData()
      }
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error)
    }
  }

  const awardPoints = async (activityType: string, metadata?: any) => {
    try {
      const response = await fetch("/api/gamification/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType, metadata }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Show level up notification if applicable
        if (result.data.leveledUp) {
          showLevelUp(result.data.newLevel, result.data.xpEarned)
        }

        // Refresh gamification data
        const gamifRes = await fetch("/api/gamification/points")
        if (gamifRes.ok) {
          const gamifData = await gamifRes.json()
          setGamificationData(gamifData.data)
        }
      }
    } catch (error) {
      console.error("Erro ao atribuir pontos:", error)
    }
  }

  const getTaskStatusColor = (status: string) => {
    const colors = {
      pendente: "bg-yellow-100 text-yellow-800",
      em_progresso: "bg-blue-100 text-blue-800",
      concluida: "bg-green-100 text-green-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      baixa: "border-green-200",
      media: "border-yellow-200",
      alta: "border-red-200",
    }
    return colors[priority as keyof typeof colors] || "border-gray-200"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (!data || !gamificationData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">{t("loadError")}</p>
        <Button onClick={fetchAllData} className="mt-4">
          {t("tryAgain")}
        </Button>
      </div>
    )
  }

  const completionRate =
    data.stats.tasks.total > 0 ? Math.round((data.stats.tasks.completed / data.stats.tasks.total) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Level Up Notification */}
      <LevelUpNotification
        show={notification.show}
        newLevel={notification.newLevel}
        xpEarned={notification.xpEarned}
        onClose={hideLevelUp}
      />

      <div>
        <h1 className="text-3xl font-bold text-slate-800">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      {/* XP Progress Bar */}
      <XPProgressBar
        currentXP={gamificationData.user.totalXP}
        currentLevel={gamificationData.user.currentLevel}
        progressToNextLevel={gamificationData.user.progressToNextLevel}
        xpNeededForNextLevel={gamificationData.user.xpNeededForNextLevel}
      />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">{t("stats.totalXP")}</p>
                <p className="text-2xl font-bold">{gamificationData.user.totalXP.toLocaleString()}</p>
                <p className="text-xs text-blue-200">{t("stats.level")} {gamificationData.user.currentLevel}</p>
              </div>
              <Star className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">{t("stats.weeklyPoints")}</p>
                <p className="text-2xl font-bold">{gamificationData.user.weeklyPoints}</p>
                <p className="text-xs text-green-200">{t("stats.thisWeek")}</p>
              </div>
              <Zap className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">{t("stats.streak")}</p>
                <p className="text-2xl font-bold">{gamificationData.user.streak}</p>
                <p className="text-xs text-orange-200">{t("stats.consecutiveDays")}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{t("stats.tasks")}</p>
                <p className="text-2xl font-bold text-slate-800">{data.stats.tasks.completed}</p>
                <p className="text-xs text-slate-500">{completionRate}% {t("stats.completed")}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="achievements">{t("tabs.achievements")}</TabsTrigger>
          <TabsTrigger value="challenges">{t("tabs.challenges")}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t("tabs.leaderboard")}</TabsTrigger>
          <TabsTrigger value="activities">{t("tabs.activities")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-caris-teal" />
                  {t("recentActivities.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gamificationData.recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {gamificationData.recentActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{activity.description}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(activity.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-blue-600">
                            <Star className="w-4 h-4" />
                            <span className="font-medium">+{activity.xp} XP</span>
                          </div>
                          <div className="text-sm text-slate-500">+{activity.points} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">
                    {t("recentActivities.empty")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Challenge Preview */}
            {challengesData && challengesData.activeChallenges && (
              <ChallengeWidget 
                challenges={challengesData.activeChallenges.slice(0, 2)}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {achievementsData ? (
            <div className="space-y-6">
              {Object.entries(achievementsData.achievements).map(([category, achievements]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {t("achievements.title")} - {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                      {(achievements as any[]).map((achievement) => (
                        <AchievementBadge
                          key={achievement.id}
                          achievement={achievement}
                          size="md"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-slate-600">{t("achievements.loading")}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          {challengesData ? (
            <ChallengeWidget
              challenges={challengesData.activeChallenges || []}
            />
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-slate-600">{t("challenges.loading")}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <LeaderboardDisplay 
            data={leaderboardData}
            loading={!leaderboardData}
          />
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("emotionalMap.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmotionalMap data={data.emotionalMapData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}