'use client'

/**
 * Meditation Charts Component
 * Visualizes meditation practice progress over time
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface MeditationChartsProps {
  userId: number
}

interface ChartData {
  date: string
  minutes: number
  sessions: number
}

export default function MeditationCharts({ userId }: MeditationChartsProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChartData() {
      try {
        const response = await fetch(`/api/meditation/chart-data?userId=${userId}&period=30`)

        if (response.ok) {
          const data = await response.json()
          setChartData(data.chartData || [])
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Minutos de Meditação (Últimos 30 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('pt-BR')
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Minutos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessões por Dia (Últimos 30 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('pt-BR')
                }}
              />
              <Legend />
              <Bar
                dataKey="sessions"
                fill="#8b5cf6"
                name="Sessões"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
