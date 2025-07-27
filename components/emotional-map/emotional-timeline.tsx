"use client"

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, TrendingDown, Activity, Brain } from 'lucide-react'

interface EmotionalData {
  date: Date
  moodRating: number
  dominantEmotion: string
  intensity: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  content: string
  plutchikCategories: string[]
  aiInsights?: string[]
}

interface EmotionalTimelineProps {
  data: EmotionalData[]
  onPointClick?: (data: EmotionalData) => void
}

const EMOTION_COLORS = {
  alegria: '#FFD700',
  tristeza: '#4169E1',
  raiva: '#FF4500',
  medo: '#8B0000',
  surpresa: '#FF69B4',
  aversão: '#32CD32',
  confiança: '#00CED1',
  expectativa: '#FFA500',
  neutro: '#708090',
  ansiedade: '#9932CC',
  amor: '#DC143C',
  culpa: '#8B4513'
}

const RISK_COLORS = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
}

export function EmotionalTimeline({ data, onPointClick }: EmotionalTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all')
  const [hoveredPoint, setHoveredPoint] = useState<EmotionalData | null>(null)

  const filteredData = React.useMemo(() => {
    let filtered = [...data]
    
    // Filtrar por período
    const now = new Date()
    const periodDays = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    
    filtered = filtered.filter(d => d.date >= startDate)
    
    // Filtrar por emoção
    if (selectedEmotion !== 'all') {
      filtered = filtered.filter(d => d.dominantEmotion === selectedEmotion)
    }
    
    return filtered.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [data, selectedPeriod, selectedEmotion])

  const emotions = React.useMemo(() => {
    const uniqueEmotions = [...new Set(data.map(d => d.dominantEmotion))]
    return uniqueEmotions.filter(Boolean)
  }, [data])

  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 60, bottom: 60, left: 60 }
    const width = 800 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Escalas
    const xScale = d3.scaleTime()
      .domain(d3.extent(filteredData, d => d.date) as [Date, Date])
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([height, 0])

    // Linha para conectar os pontos
    const line = d3.line<EmotionalData>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.moodRating))
      .curve(d3.curveMonotoneX)

    // Área sombreada
    const area = d3.area<EmotionalData>()
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => yScale(d.moodRating))
      .curve(d3.curveMonotoneX)

    // Adicionar área
    g.append("path")
      .datum(filteredData)
      .attr("fill", "#06b6d4")
      .attr("fill-opacity", 0.1)
      .attr("d", area)

    // Adicionar linha
    g.append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", "#06b6d4")
      .attr("stroke-width", 2)
      .attr("d", line)

    // Adicionar pontos
    const circles = g.selectAll(".dot")
      .data(filteredData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.moodRating))
      .attr("r", d => 4 + d.intensity)
      .attr("fill", d => EMOTION_COLORS[d.dominantEmotion as keyof typeof EMOTION_COLORS] || '#708090')
      .attr("stroke", d => RISK_COLORS[d.riskLevel])
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        setHoveredPoint(d)
        d3.select(this).attr("r", 8 + d.intensity)
      })
      .on("mouseout", function(event, d) {
        setHoveredPoint(null)
        d3.select(this).attr("r", 4 + d.intensity)
      })
      .on("click", function(event, d) {
        onPointClick?.(d)
      })

    // Eixos
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat("%d/%m"))

    const yAxis = d3.axisLeft(yScale)
      .tickValues([1, 3, 5, 7, 9])

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Data")

    g.append("g")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Humor (1-10)")

    // Linhas de referência
    const referenceLines = [3, 5, 7]
    referenceLines.forEach(value => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(value))
        .attr("y2", yScale(value))
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.5)
    })

  }, [filteredData, onPointClick])

  const stats = React.useMemo(() => {
    if (filteredData.length === 0) return null

    const avgMood = filteredData.reduce((sum, d) => sum + d.moodRating, 0) / filteredData.length
    const highRiskDays = filteredData.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length
    const mostFrequentEmotion = d3.rollup(
      filteredData, 
      v => v.length, 
      d => d.dominantEmotion
    )
    const topEmotion = Array.from(mostFrequentEmotion.entries())
      .sort((a, b) => b[1] - a[1])[0]

    // Calcular tendência
    const recent = filteredData.slice(-7)
    const earlier = filteredData.slice(0, -7)
    const recentAvg = recent.reduce((sum, d) => sum + d.moodRating, 0) / recent.length
    const earlierAvg = earlier.length > 0 
      ? earlier.reduce((sum, d) => sum + d.moodRating, 0) / earlier.length 
      : recentAvg

    const trend = recentAvg > earlierAvg + 0.5 ? 'up' : 
                  recentAvg < earlierAvg - 0.5 ? 'down' : 'stable'

    return {
      avgMood: Math.round(avgMood * 10) / 10,
      highRiskDays,
      topEmotion: topEmotion?.[0] || 'neutro',
      topEmotionCount: topEmotion?.[1] || 0,
      trend,
      totalEntries: filteredData.length
    }
  }, [filteredData])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Mapa Emocional Interativo
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">3 Meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmotion} onValueChange={setSelectedEmotion}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas emoções</SelectItem>
                {emotions.map(emotion => (
                  <SelectItem key={emotion} value={emotion}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || '#708090' }}
                      />
                      {emotion}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {stats && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Humor médio: {stats.avgMood}/10</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> :
               stats.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500" /> :
               <Activity className="w-4 h-4 text-gray-500" />}
              <span>Tendência: {stats.trend === 'up' ? 'Melhorando' : stats.trend === 'down' ? 'Declinando' : 'Estável'}</span>
            </div>
            <Badge variant={stats.highRiskDays > 0 ? "destructive" : "secondary"}>
              {stats.highRiskDays} dias de alto risco
            </Badge>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: EMOTION_COLORS[stats.topEmotion as keyof typeof EMOTION_COLORS] || '#708090' }}
              />
              <span>Emoção principal: {stats.topEmotion} ({stats.topEmotionCount}x)</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          <svg ref={svgRef} className="w-full" />
          
          {hoveredPoint && (
            <div 
              className="absolute bg-black/90 text-white p-3 rounded-lg text-sm z-10 pointer-events-none"
              style={{
                left: '50%',
                top: '10px',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-semibold">{hoveredPoint.date.toLocaleDateString()}</div>
              <div>Humor: {hoveredPoint.moodRating}/10</div>
              <div>Emoção: {hoveredPoint.dominantEmotion}</div>
              <div>Intensidade: {hoveredPoint.intensity}/10</div>
              <div className="flex items-center gap-1">
                Risco: 
                <div 
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ backgroundColor: RISK_COLORS[hoveredPoint.riskLevel] }}
                />
                {hoveredPoint.riskLevel}
              </div>
              {hoveredPoint.content && (
                <div className="mt-2 max-w-xs">
                  <div className="font-medium">Conteúdo:</div>
                  <div className="text-xs opacity-90 line-clamp-3">
                    {hoveredPoint.content.substring(0, 100)}...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="text-sm text-gray-600">Legenda:</div>
          {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
            <div key={emotion} className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {emotion}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}