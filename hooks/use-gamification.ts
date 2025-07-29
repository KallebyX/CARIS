"use client"

import { useState, useCallback } from "react"
import { toast } from "react-hot-toast"

interface GamificationHookResult {
  awardPoints: (activityType: string, metadata?: any) => Promise<boolean>
  checkAchievements: () => Promise<void>
  loading: boolean
}

export function useGamification(): GamificationHookResult {
  const [loading, setLoading] = useState(false)

  const awardPoints = useCallback(async (activityType: string, metadata?: any): Promise<boolean> => {
    setLoading(true)
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
          toast.success(`🎉 Parabéns! Você subiu para o nível ${result.data.newLevel}!`, {
            duration: 5000,
            position: "top-center",
          })
        } else {
          // Show points earned
          toast.success(`+${result.data.xpEarned} XP ganhos!`, {
            duration: 2000,
            position: "bottom-right",
          })
        }

        return true
      }
      return false
    } catch (error) {
      console.error("Error awarding points:", error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAchievements = useCallback(async () => {
    try {
      const response = await fetch("/api/gamification/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkAll: true }),
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.data.newAchievements?.length > 0) {
          for (const achievement of result.data.newAchievements) {
            toast.success(`🏆 Nova conquista desbloqueada: ${achievement.name}!`, {
              duration: 4000,
              position: "top-center",
            })
          }
        }
      }
    } catch (error) {
      console.error("Error checking achievements:", error)
    }
  }, [])

  return {
    awardPoints,
    checkAchievements,
    loading,
  }
}

// Hook for managing gamification data
export function useGamificationData() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pointsRes, achievementsRes, challengesRes] = await Promise.all([
        fetch("/api/gamification/points"),
        fetch("/api/gamification/achievements"),
        fetch("/api/gamification/challenges"),
      ])

      const [pointsData, achievementsData, challengesData] = await Promise.all([
        pointsRes.ok ? pointsRes.json() : null,
        achievementsRes.ok ? achievementsRes.json() : null,
        challengesRes.ok ? challengesRes.json() : null,
      ])

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
  }, [])

  return {
    data,
    loading,
    refetch: fetchData,
  }
}