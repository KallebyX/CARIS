"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts"
import { TrendingUp, Users, Calendar, Brain, Target } from "lucide-react"

const COLORS = {
  primary: "#2D9B9B",
  secondary: "#F4A261",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
}

interface AdvancedChartsProps {
  data: {
    sessionStats: any
    sessionEvolution: any
    moodTrends: any
    sosUsage: any
    taskCompletion: any
    diaryActivity: any[]
    achievements: any
  }
  period: string
  onPeriodChange: (period: string) => void
}

export function AdvancedCharts({ data, period, onPeriodChange }: AdvancedChartsProps) {
  // Processar dados para os gráficos
  const sessionEvolutionData = Object.entries(data.sessionEvolution || {}).map(([month, stats]: [string, any]) => ({
    month,
    total: stats.total || 0,
    realizadas: stats.realizadas || 0,
    canceladas: stats.canceladas || 0,
    taxa_conclusao: stats.total > 0 ? Math.round((stats.realizadas / stats.total) * 100) : 0,
  }))

  const moodTrendsData = Object.entries(data.moodTrends || {})
    .map(([date, moods]: [string, any]) => ({
      date,
      humor_medio:
        moods.mood.length > 0
          ? Math.round((moods.mood.reduce((a: number, b: number) => a + b, 0) / moods.mood.length) * 10) / 10
          : 0,
      energia_media:
        moods.energy.length > 0
          ? Math.round((moods.energy.reduce((a: number, b: number) => a + b, 0) / moods.energy.length) * 10) / 10
          : 0,
      ansiedade_media:
        moods.anxiety.length > 0
          ? Math.round((moods.anxiety.reduce((a: number, b: number) => a + b, 0) / moods.anxiety.length) * 10) / 10
          : 0,
    }))
    .slice(-30) // Últimos 30 pontos

  const sosUsageData = Object.entries(data.sosUsage || {}).map(([tool, stats]: [string, any]) => ({
    ferramenta: tool === "breathing" ? "Respiração" : tool === "meditation" ? "Meditação" : "Grounding",
    usos: stats.count || 0,
    duracao_media: stats.avgDuration || 0,
  }))

  const taskCompletionData = Object.entries(data.taskCompletion.byPriority || {}).map(
    ([priority, stats]: [string, any]) => ({
      prioridade: priority === "alta" ? "Alta" : priority === "media" ? "Média" : "Baixa",
      total: stats.total || 0,
      concluidas: stats.completed || 0,
      taxa: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }),
  )

  const diaryActivityData = (data.diaryActivity || []).map((entry: any) => ({
    data: entry.date,
    entradas: entry.entries || 0,
    humor_medio: Math.round((entry.avgMood || 0) * 10) / 10,
  }))

  const achievementsData = Object.entries(data.achievements || {}).map(([type, count]: [string, any]) => ({
    tipo:
      type === "first_entry"
        ? "Primeira Entrada"
        : type === "week_streak"
          ? "Sequência Semanal"
          : type === "sos_usage"
            ? "Uso SOS"
            : "Outras",
    quantidade: count,
    fill:
      type === "first_entry"
        ? COLORS.success
        : type === "week_streak"
          ? COLORS.primary
          : type === "sos_usage"
            ? COLORS.warning
            : COLORS.info,
  }))

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Relatórios Avançados</h2>
          <p className="text-slate-600">Análise detalhada do progresso e engajamento</p>
        </div>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-slate-800">
                  {data.sessionStats?.total > 0
                    ? Math.round(((data.sessionStats.byStatus?.realizada || 0) / data.sessionStats.total) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Engajamento SOS</p>
                <p className="text-2xl font-bold text-slate-800">
                  {Object.values(data.sosUsage || {}).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0)}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Brain className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tarefas Concluídas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {data.taskCompletion?.completed || 0}/{data.taskCompletion?.total || 0}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pacientes Ativos</p>
                <p className="text-2xl font-bold text-slate-800">{data.patients?.length || 0}</p>
              </div>
              <div className="p-2 bg-teal-100 rounded-lg">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de Sessões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Evolução de Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sessionEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="realizadas" fill={COLORS.success} name="Realizadas" />
                  <Bar dataKey="canceladas" fill={COLORS.danger} name="Canceladas" />
                  <Line
                    type="monotone"
                    dataKey="taxa_conclusao"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    name="Taxa de Conclusão (%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tendências de Humor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Tendências de Humor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodTrendsData}>
                  <defs>
                    <linearGradient id="colorHumor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnergia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[0, 5]} stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="humor_medio"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorHumor)"
                    name="Humor Médio"
                  />
                  <Area
                    type="monotone"
                    dataKey="energia_media"
                    stroke={COLORS.secondary}
                    fillOpacity={1}
                    fill="url(#colorEnergia)"
                    name="Energia Média"
                  />
                  <Line
                    type="monotone"
                    dataKey="ansiedade_media"
                    stroke={COLORS.danger}
                    strokeWidth={2}
                    name="Ansiedade Média"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Uso de Ferramentas SOS */}
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas SOS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sosUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ ferramenta, percent }) => `${ferramenta} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="usos"
                  >
                    {sosUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Progresso de Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso de Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskCompletionData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="prioridade" type="category" stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar dataKey="concluidas" fill={COLORS.success} name="Concluídas" />
                  <Bar dataKey="total" fill={COLORS.info} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conquistas */}
        <Card>
          <CardHeader>
            <CardTitle>Conquistas Desbloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={achievementsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="quantidade"
                  >
                    {achievementsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividade do Diário */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade no Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={diaryActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="entradas" fill={COLORS.primary} name="Entradas" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humor_medio"
                  stroke={COLORS.secondary}
                  strokeWidth={3}
                  name="Humor Médio"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
