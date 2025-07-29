"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
  isGlobalAdmin: boolean
  lastLoginAt: string | null
  createdAt: string
  clinics: Array<{
    id: number
    name: string
    role: string
    status: string
  }>
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  clinicOwners: number
  newUsersThisMonth: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, statsResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/users/stats")
        ])

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.data || [])
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.data)
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "" || user.role === filterRole
    const matchesStatus = filterStatus === "" || user.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium"
      case "clinic_owner":
        return "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
      case "clinic_admin":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
      case "psychologist":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
      case "patient":
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
      case "suspended":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium"
      case "inactive":
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
    }
  }

  const formatRole = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "clinic_owner":
        return "Proprietário"
      case "clinic_admin":
        return "Admin Clínica"
      case "psychologist":
        return "Psicólogo"
      case "patient":
        return "Paciente"
      default:
        return role
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "suspended":
        return "Suspenso"
      case "inactive":
        return "Inativo"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
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
          <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
          <p className="text-slate-600 mt-1">Gerencie todos os usuários da plataforma</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
          ➕ Novo Usuário
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-slate-500">Todos os usuários</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeUsers || 0}</p>
              <p className="text-xs text-green-600">Status ativo</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Administradores</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.adminUsers || 0}</p>
              <p className="text-xs text-slate-500">Admins e proprietários</p>
            </div>
            <div className="text-2xl">👑</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Novos Este Mês</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.newUsersThisMonth || 0}</p>
              <p className="text-xs text-green-600">Crescimento</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Buscar usuário
            </label>
            <input
              type="text"
              placeholder="Nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filtrar por papel
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos os papéis</option>
              <option value="admin">Administrador</option>
              <option value="clinic_owner">Proprietário</option>
              <option value="clinic_admin">Admin Clínica</option>
              <option value="psychologist">Psicólogo</option>
              <option value="patient">Paciente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filtrar por status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("")
                setFilterRole("")
                setFilterStatus("")
              }}
              className="w-full px-4 py-2 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Papel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Clínicas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Último Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                        {user.isGlobalAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getRoleColor(user.role)}>
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusColor(user.status)}>
                      {formatStatus(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.clinics.length > 0 ? (
                        <div className="space-y-1">
                          {user.clinics.slice(0, 2).map((clinic) => (
                            <div key={clinic.id} className="text-xs">
                              <Link href={`/admin/clinics/${clinic.id}`} className="text-teal-600 hover:text-teal-800">
                                {clinic.name}
                              </Link>
                              <span className="text-slate-500 ml-1">({clinic.role})</span>
                            </div>
                          ))}
                          {user.clinics.length > 2 && (
                            <div className="text-xs text-slate-500">
                              +{user.clinics.length - 2} mais
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Nenhuma clínica</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR')
                        : "Nunca"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-teal-600 hover:text-teal-900">
                        Editar
                      </button>
                      <button className="text-slate-600 hover:text-slate-900">
                        Ver
                      </button>
                      {user.status === "active" ? (
                        <button className="text-red-600 hover:text-red-900">
                          Suspender
                        </button>
                      ) : (
                        <button className="text-green-600 hover:text-green-900">
                          Ativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-500">
              {users.length === 0 ? "Nenhum usuário encontrado" : "Nenhum usuário corresponde aos filtros"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
