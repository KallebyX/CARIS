"use client"

import { useState, useEffect } from "react"

interface AdminStats {
  totalClinics: number
  activeClinics: number
  totalUsers: number
  newClinicsThisMonth: number
  newUsersThisMonth: number
  totalRevenue: number
  sessionsThisMonth: number
  growthRates: {
    clinics: number
    users: number
    revenue: number
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data.data)
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
          <p className="text-slate-600 mt-1">Visão geral da plataforma multi-clínicas</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total de Clínicas</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalClinics || 0}</p>
              <p className="text-xs text-green-600">+{stats?.newClinicsThisMonth || 0} este mês</p>
            </div>
            <div className="text-2xl">🏢</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-green-600">+{stats?.newUsersThisMonth || 0} este mês</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Mensal</p>
              <p className="text-2xl font-bold text-slate-900">
                R$ {(stats?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600">+{stats?.growthRates.revenue || 0}% vs. mês passado</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Sessões Este Mês</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessionsThisMonth || 0}</p>
              <p className="text-xs text-green-600">+{stats?.growthRates.users || 0}% crescimento</p>
            </div>
            <div className="text-2xl">🗓️</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Status das Clínicas</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Clínicas Ativas</span>
              <span className="text-lg font-semibold text-green-600">{stats?.activeClinics || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total de Clínicas</span>
              <span className="text-lg font-semibold text-slate-900">{stats?.totalClinics || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{
                  width: `${stats ? (stats.activeClinics / stats.totalClinics) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Atividade Recente</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-600">
                {stats?.newClinicsThisMonth || 0} novas clínicas cadastradas este mês
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-slate-600">
                {stats?.newUsersThisMonth || 0} novos usuários registrados
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-slate-600">
                {stats?.sessionsThisMonth || 0} sessões realizadas este mês
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-medium text-slate-900">Gerenciar Clínicas</div>
            <div className="text-sm text-slate-600">Visualizar e administrar todas as clínicas</div>
          </button>
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-slate-900">Gerenciar Usuários</div>
            <div className="text-sm text-slate-600">Administrar contas e permissões</div>
          </button>
          <button className="p-4 border border-slate-300 rounded-lg hover:bg-slate-50 text-left">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-slate-900">Relatórios</div>
            <div className="text-sm text-slate-600">Visualizar métricas e analytics</div>
          </button>
        </div>
      </div>
    </div>
  )
}
