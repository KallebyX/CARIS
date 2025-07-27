"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area, ReferenceLine } from "recharts"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="p-4 bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700">
        <p className="font-bold text-base">{`Data: ${label}`}</p>
        <p className="text-sm text-teal-300">{`Humor: ${data.humor}/10`}</p>
        <p className="text-sm text-orange-300">{`Intensidade: ${data.intensidade}/10`}</p>
        {data.evento && <p className="text-sm text-slate-300 mt-2 italic">{`${data.evento}`}</p>}
      </div>
    )
  }
  return null
}

interface EmotionalMapProps {
  data: {
    date: string
    humor: number
    intensidade: number
    evento?: string
  }[]
}

export function EmotionalMap({ data }: EmotionalMapProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Mapa Emocional Interativo</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-slate-500">Sem dados suficientes para exibir o mapa emocional.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-800">Mapa Emocional Interativo</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-transparent">
              <Calendar className="w-4 h-4 mr-2" />
              Últimos 30 dias
            </Button>
          </div>
        </div>
        <p className="text-slate-500 text-sm">Visualização da jornada emocional do paciente.</p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 20,
                left: -10,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorHumor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--caris-teal))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--caris-teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--caris-orange))", strokeWidth: 2 }} />
              <ReferenceLine y={5} label="Neutro" stroke="#94a3b8" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="humor"
                stroke="hsl(var(--caris-teal))"
                fill="url(#colorHumor)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
