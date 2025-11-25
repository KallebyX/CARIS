"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Plus, BookOpen, Brain } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/lib/i18n"

interface DashboardData {
  stats: {
    totalPatients: number
    sessionsToday: number
  }
  upcomingSessions: any[]
  recentActivities: any[]
}

export default function DashboardPage() {
  const t = useTranslations('psychologist')
  const tDash = useTranslations('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/psychologist/dashboard")
        if (res.ok) {
          const dashboardData = await res.json()
          setData(dashboardData)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getCycleColor = (cycle: string) => {
    const colors = {
      criar: "bg-emerald-500",
      cuidar: "bg-blue-500",
      crescer: "bg-purple-500",
      curar: "bg-orange-500",
    }
    return colors[cycle as keyof typeof colors] || "bg-gray-500"
  }

  if (loading) {
    return <div>{t('loading')}</div>
  }

  if (!data) {
    return <div>{t('loadError')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{tDash('title')}</h1>
          <p className="text-gray-600">{t('welcomeBack')}</p>
        </div>
        <div className="flex space-x-3">
          <Button className="bg-purple-600 hover:bg-purple-700" asChild>
            <Link href="/dashboard/ai-assistant">
              <Brain className="w-4 h-4 mr-2" />
              {t('aiAssistant')}
            </Link>
          </Button>
          <Button className="bg-[#2D9B9B] hover:bg-[#238B8B]" asChild>
            <Link href="/dashboard/patients/new">
              <Plus className="w-4 h-4 mr-2" />
              {t('newPatient')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/schedule">
              <Calendar className="w-4 h-4 mr-2" />
              {t('scheduleSession')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('totalPatients')}</p>
                <p className="text-3xl font-bold text-gray-800">{data.stats.totalPatients}</p>
              </div>
              <Users className="w-8 h-8 text-[#2D9B9B]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('sessionsToday')}</p>
                <p className="text-3xl font-bold text-gray-800">{data.stats.sessionsToday}</p>
              </div>
              <Calendar className="w-8 h-8 text-[#F4A261]" />
            </div>
          </CardContent>
        </Card>
        {/* Other stat cards can be added here */}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#2D9B9B]" />
              {t('upcomingSessions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getCycleColor(session.patient.currentCycle)}`}></div>
                    <div>
                      <p className="font-medium text-gray-800">{session.patient.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        - {session.type}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {session.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/dashboard/schedule">{t('viewFullSchedule')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-[#F4A261]" />
              {t('recentActivities')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mt-2 ${getCycleColor(activity.cycle)}`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.patient}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(activity.time).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/dashboard/patients">{t('viewAllPatients')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
