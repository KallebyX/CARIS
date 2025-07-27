// Mock data for development - will be replaced with real API calls
const mockClinics = [
  {
    id: 1,
    name: "Clínica Bem-Estar",
    slug: "clinica-bem-estar",
    status: "active",
    planType: "professional",
    totalUsers: 45,
    monthlyRevenue: 12500.00,
    owner: "Dr. Maria Silva"
  },
  {
    id: 2,
    name: "Centro Terapêutico Vida",
    slug: "centro-vida",
    status: "active", 
    planType: "enterprise",
    totalUsers: 78,
    monthlyRevenue: 25800.00,
    owner: "Dr. João Santos"
  },
  {
    id: 3,
    name: "Espaço Mente Saudável",
    slug: "mente-saudavel",
    status: "suspended",
    planType: "basic",
    totalUsers: 12,
    monthlyRevenue: 3200.00,
    owner: "Dra. Ana Costa"
  }
]

export default function AdminClinicsPage() {
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

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basic":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
      case "professional":
        return "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
      case "enterprise":
        return "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestão de Clínicas</h1>
          <p className="text-slate-600 mt-1">Gerencie todas as clínicas da plataforma</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
          ➕ Nova Clínica
        </button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total de Clínicas</p>
              <p className="text-2xl font-bold text-slate-900">{mockClinics.length}</p>
              <p className="text-xs text-slate-500">+2 este mês</p>
            </div>
            <div className="text-2xl">🏢</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-slate-900">
                {mockClinics.reduce((sum, clinic) => sum + clinic.totalUsers, 0)}
              </p>
              <p className="text-xs text-slate-500">+15 esta semana</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Total</p>
              <p className="text-2xl font-bold text-slate-900">
                R$ {mockClinics.reduce((sum, clinic) => sum + clinic.monthlyRevenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500">+12.5% vs. mês passado</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Taxa de Crescimento</p>
              <p className="text-2xl font-bold text-slate-900">+18.2%</p>
              <p className="text-xs text-slate-500">Crescimento mensal</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Lista de Clínicas */}
      <div className="grid gap-6">
        {mockClinics.map((clinic) => (
          <div key={clinic.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-slate-900">{clinic.name}</h3>
                <p className="text-sm text-slate-600">Proprietário: {clinic.owner}</p>
                <p className="text-sm text-slate-500">/{clinic.slug}</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className={getStatusColor(clinic.status)}>
                  {clinic.status === "active" ? "Ativa" : 
                   clinic.status === "suspended" ? "Suspensa" : "Inativa"}
                </span>
                <span className={getPlanColor(clinic.planType)}>
                  {clinic.planType === "basic" ? "Básico" :
                   clinic.planType === "professional" ? "Profissional" : "Empresarial"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Usuários</p>
                <p className="text-2xl font-semibold text-slate-900">{clinic.totalUsers}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Receita Mensal</p>
                <p className="text-2xl font-semibold text-slate-900">
                  R$ {clinic.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex gap-2">
                  <button className="border border-slate-300 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-50">
                    Ver Detalhes
                  </button>
                  <button className="border border-slate-300 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-50">
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}