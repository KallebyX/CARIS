"use client"

import React from 'react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, TrendingUp } from 'lucide-react'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface EmotionData {
  emotion: string
  frequency: number
  intensity: number
  trend: 'up' | 'down' | 'stable'
}

interface PlutchikRadarProps {
  data: EmotionData[]
  period?: 'week' | 'month' | 'quarter'
  onPeriodChange?: (period: 'week' | 'month' | 'quarter') => void
}

const PLUTCHIK_EMOTIONS = [
  'Alegria',
  'Confiança', 
  'Medo',
  'Surpresa',
  'Tristeza',
  'Aversão',
  'Raiva',
  'Expectativa'
] as const

const PLUTCHIK_COLORS = {
  'Alegria': '#FFD700',
  'Confiança': '#00CED1',
  'Medo': '#8B0000', 
  'Surpresa': '#FF69B4',
  'Tristeza': '#4169E1',
  'Aversão': '#32CD32',
  'Raiva': '#FF4500',
  'Expectativa': '#FFA500'
}

export function PlutchikRadar({ data, period = 'month', onPeriodChange }: PlutchikRadarProps) {
  // Preparar dados para o radar chart
  const chartData = React.useMemo(() => {
    const emotionMap = new Map(data.map(d => [d.emotion.toLowerCase(), d]))
    
    const frequencies = PLUTCHIK_EMOTIONS.map(emotion => {
      const emotionData = emotionMap.get(emotion.toLowerCase())
      return emotionData?.frequency || 0
    })
    
    const intensities = PLUTCHIK_EMOTIONS.map(emotion => {
      const emotionData = emotionMap.get(emotion.toLowerCase())
      return emotionData?.intensity || 0
    })

    return {
      labels: PLUTCHIK_EMOTIONS,
      datasets: [
        {
          label: 'Frequência',
          data: frequencies,
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          borderColor: 'rgba(6, 182, 212, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(6, 182, 212, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(6, 182, 212, 1)',
        },
        {
          label: 'Intensidade',
          data: intensities,
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(249, 115, 22, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(249, 115, 22, 1)',
        },
      ],
    }
  }, [data])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const emotion = context.label
            const value = context.parsed.r
            const type = context.dataset.label
            return `${emotion} - ${type}: ${value.toFixed(1)}`
          }
        }
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0,0,0,0.1)'
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        pointLabels: {
          display: true,
          font: {
            size: 12
          }
        },
        suggestedMin: 0,
        suggestedMax: 10,
        ticks: {
          display: true,
          stepSize: 2
        }
      },
    },
  }

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    if (data.length === 0) return null

    const dominantEmotion = data.reduce((prev, current) => 
      (prev.frequency > current.frequency) ? prev : current
    )

    const totalFrequency = data.reduce((sum, d) => sum + d.frequency, 0)
    const avgIntensity = data.reduce((sum, d) => sum + d.intensity, 0) / data.length

    const positiveEmotions = ['alegria', 'confiança', 'expectativa']
    const negativeEmotions = ['tristeza', 'medo', 'raiva', 'aversão']
    
    const positiveScore = data
      .filter(d => positiveEmotions.includes(d.emotion.toLowerCase()))
      .reduce((sum, d) => sum + d.frequency * d.intensity, 0)
    
    const negativeScore = data
      .filter(d => negativeEmotions.includes(d.emotion.toLowerCase()))
      .reduce((sum, d) => sum + d.frequency * d.intensity, 0)

    const emotionalBalance = positiveScore / (positiveScore + negativeScore) * 100

    const improvingEmotions = data.filter(d => d.trend === 'up')
    const decliningEmotions = data.filter(d => d.trend === 'down')

    return {
      dominantEmotion,
      totalFrequency,
      avgIntensity: Math.round(avgIntensity * 10) / 10,
      emotionalBalance: Math.round(emotionalBalance),
      improvingEmotions,
      decliningEmotions
    }
  }, [data])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Mapa Emocional Plutchik
          </CardTitle>
          {onPeriodChange && (
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">3 Meses</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Emoção Dominante</div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: PLUTCHIK_COLORS[stats.dominantEmotion.emotion as keyof typeof PLUTCHIK_COLORS] || '#708090' 
                  }}
                />
                {stats.dominantEmotion.emotion}
              </div>
            </div>
            
            <div>
              <div className="font-medium">Balanço Emocional</div>
              <div className={`font-semibold ${stats.emotionalBalance >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.emotionalBalance}% positivo
              </div>
            </div>
            
            <div>
              <div className="font-medium">Intensidade Média</div>
              <div className="font-semibold">{stats.avgIntensity}/10</div>
            </div>
            
            <div>
              <div className="font-medium">Total de Registros</div>
              <div className="font-semibold">{stats.totalFrequency}</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-96 mb-6">
          <Radar data={chartData} options={options} />
        </div>
        
        {stats && (
          <div className="space-y-4">
            {stats.improvingEmotions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Emoções em Melhora</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.improvingEmotions.map(emotion => (
                    <Badge key={emotion.emotion} variant="secondary" className="bg-green-100 text-green-800">
                      {emotion.emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {stats.decliningEmotions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                  <span className="font-medium">Emoções em Declínio</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.decliningEmotions.map(emotion => (
                    <Badge key={emotion.emotion} variant="secondary" className="bg-red-100 text-red-800">
                      {emotion.emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900 mb-2">Sobre o Modelo Plutchik</div>
              <div className="text-sm text-blue-800">
                O modelo de Plutchik identifica 8 emoções básicas organizadas em pares opostos:
                Alegria ↔ Tristeza, Confiança ↔ Aversão, Medo ↔ Raiva, Surpresa ↔ Expectativa.
                Esta análise ajuda a compreender o padrão emocional e identificar áreas para trabalho terapêutico.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}