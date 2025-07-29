"use client"

import { useState, useEffect } from "react"

interface FinancialData {
  period: string
  totalRevenue: number
  totalSessions: number
  newPatients: number
  activePatients: number
  churnRate: number
  growthRate: number
}

interface ReportStats {
  totalRevenue: number
  monthlyGrowth: number
  averageSessionValue: number
  totalSessions: number
  activeSubscriptions: number
  churnRate: number
}

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<FinancialData[]>([])
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("monthly")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [reportsResponse, statsResponse] = await Promise.all([
          fetch(`/api/admin/reports?period=${selectedPeriod}&year=${selectedYear}`),
          fetch("/api/admin/reports/stats")
        ])

        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json()
          setReportData(reportsData.data || [])
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.data)
        }
      } catch (error) {
        console.error("Error fetching reports:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [selectedPeriod, selectedYear])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Relatórios Financeiros</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Relatórios Financeiros</h1>
          <p className="text-slate-600 mt-1">Analytics de receita, crescimento e performance</p>
        </div>
        <div className="flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {[2024, 2023, 2022].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Total</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <p className="text-xs text-green-600">+{formatPercentage(stats?.monthlyGrowth || 0)} este mês</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Sessões Realizadas</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalSessions || 0}</p>
              <p className="text-xs text-slate-500">Total do período</p>
            </div>
            <div className="text-2xl">📅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Valor Médio por Sessão</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats?.averageSessionValue || 0)}
              </p>
              <p className="text-xs text-slate-500">Valor médio</p>
            </div>
            <div className="text-2xl">💵</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Assinaturas Ativas</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeSubscriptions || 0}</p>
              <p className="text-xs text-green-600">Status ativo</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Taxa de Churn</p>
              <p className="text-2xl font-bold text-slate-900">{formatPercentage(stats?.churnRate || 0)}</p>
              <p className="text-xs text-red-600">Cancelamentos</p>
            </div>
            <div className="text-2xl">📉</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">LTV/CAC Ratio</p>
              <p className="text-2xl font-bold text-slate-900">4.2x</p>
              <p className="text-xs text-green-600">Saudável</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Tabela de Dados Históricos */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Dados Históricos - {selectedPeriod === "monthly" ? "Mensal" : 
                                selectedPeriod === "quarterly" ? "Trimestral" : "Anual"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Receita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sessões
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Novos Pacientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pacientes Ativos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Taxa de Churn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Crescimento
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {reportData.map((period, index) => (
                <tr key={period.period} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{period.period}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{formatCurrency(period.totalRevenue)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{period.totalSessions}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{period.newPatients}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{period.activePatients}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${period.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercentage(period.churnRate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${period.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.growthRate >= 0 ? '+' : ''}{formatPercentage(period.growthRate)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reportData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-500">Nenhum dado encontrado para o período selecionado</div>
          </div>
        )}
      </div>

      {/* Ações de Exportação */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Exportar Relatórios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-slate-900">Exportar Excel</div>
            <div className="text-sm text-slate-600">Download dos dados em planilha</div>
          </button>
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-slate-900">Relatório PDF</div>
            <div className="text-sm text-slate-600">Relatório formatado para impressão</div>
          </button>
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-medium text-slate-900">Dashboard Executivo</div>
            <div className="text-sm text-slate-600">Resumo para stakeholders</div>
          </button>
        </div>
      </div>
    </div>
  )
}