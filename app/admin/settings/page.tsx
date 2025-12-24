"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Save, RefreshCw, AlertCircle, CheckCircle, Key, Mail, CreditCard, MessageSquare, Cloud, Shield, Database } from "lucide-react"

interface ApiKeyConfig {
  key: string
  value: string
  isSecret: boolean
  description: string
  isConfigured: boolean
  lastUpdated?: string
}

interface SettingsCategory {
  id: string
  name: string
  icon: React.ReactNode
  keys: ApiKeyConfig[]
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [changedValues, setChangedValues] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data.data || getDefaultSettings())
      } else {
        setSettings(getDefaultSettings())
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      setSettings(getDefaultSettings())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultSettings = (): SettingsCategory[] => [
    {
      id: "database",
      name: "Banco de Dados",
      icon: <Database className="w-5 h-5" />,
      keys: [
        { key: "POSTGRES_URL", value: "", isSecret: true, description: "URL de conexão do PostgreSQL", isConfigured: false },
        { key: "DATABASE_URL", value: "", isSecret: true, description: "URL alternativa do banco", isConfigured: false },
      ]
    },
    {
      id: "auth",
      name: "Autenticacao",
      icon: <Shield className="w-5 h-5" />,
      keys: [
        { key: "JWT_SECRET", value: "", isSecret: true, description: "Chave secreta para assinatura de tokens JWT", isConfigured: false },
        { key: "SUPER_ADMIN_PASSWORD", value: "", isSecret: true, description: "Senha do super administrador", isConfigured: false },
      ]
    },
    {
      id: "email",
      name: "Email (Resend)",
      icon: <Mail className="w-5 h-5" />,
      keys: [
        { key: "RESEND_API_KEY", value: "", isSecret: true, description: "API Key do Resend para envio de emails", isConfigured: false },
        { key: "EMAIL_FROM", value: "", isSecret: false, description: "Email de origem para envio", isConfigured: false },
      ]
    },
    {
      id: "payments",
      name: "Pagamentos (Stripe)",
      icon: <CreditCard className="w-5 h-5" />,
      keys: [
        { key: "STRIPE_SECRET_KEY", value: "", isSecret: true, description: "Chave secreta do Stripe", isConfigured: false },
        { key: "STRIPE_PUBLISHABLE_KEY", value: "", isSecret: false, description: "Chave publica do Stripe", isConfigured: false },
        { key: "STRIPE_WEBHOOK_SECRET", value: "", isSecret: true, description: "Secret do webhook do Stripe", isConfigured: false },
      ]
    },
    {
      id: "realtime",
      name: "Tempo Real (Pusher)",
      icon: <MessageSquare className="w-5 h-5" />,
      keys: [
        { key: "PUSHER_APP_ID", value: "", isSecret: false, description: "ID do app Pusher", isConfigured: false },
        { key: "PUSHER_KEY", value: "", isSecret: false, description: "Chave publica do Pusher", isConfigured: false },
        { key: "PUSHER_SECRET", value: "", isSecret: true, description: "Chave secreta do Pusher", isConfigured: false },
        { key: "PUSHER_CLUSTER", value: "", isSecret: false, description: "Cluster do Pusher (ex: sa1)", isConfigured: false },
      ]
    },
    {
      id: "ai",
      name: "Inteligencia Artificial",
      icon: <Cloud className="w-5 h-5" />,
      keys: [
        { key: "OPENAI_API_KEY", value: "", isSecret: true, description: "API Key do OpenAI para analise de IA", isConfigured: false },
        { key: "ANTHROPIC_API_KEY", value: "", isSecret: true, description: "API Key do Anthropic (Claude)", isConfigured: false },
      ]
    },
    {
      id: "sms",
      name: "SMS (Twilio)",
      icon: <MessageSquare className="w-5 h-5" />,
      keys: [
        { key: "TWILIO_ACCOUNT_SID", value: "", isSecret: false, description: "Account SID do Twilio", isConfigured: false },
        { key: "TWILIO_AUTH_TOKEN", value: "", isSecret: true, description: "Auth Token do Twilio", isConfigured: false },
        { key: "TWILIO_PHONE_NUMBER", value: "", isSecret: false, description: "Numero de telefone Twilio", isConfigured: false },
      ]
    },
    {
      id: "storage",
      name: "Armazenamento",
      icon: <Cloud className="w-5 h-5" />,
      keys: [
        { key: "CLOUDFLARE_R2_ACCESS_KEY_ID", value: "", isSecret: true, description: "Access Key ID do Cloudflare R2", isConfigured: false },
        { key: "CLOUDFLARE_R2_SECRET_ACCESS_KEY", value: "", isSecret: true, description: "Secret Access Key do R2", isConfigured: false },
        { key: "CLOUDFLARE_R2_BUCKET_NAME", value: "", isSecret: false, description: "Nome do bucket R2", isConfigured: false },
        { key: "CLOUDFLARE_R2_ENDPOINT", value: "", isSecret: false, description: "Endpoint do R2", isConfigured: false },
      ]
    },
  ]

  const toggleKeyVisibility = (key: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleKeys(newVisible)
  }

  const handleValueChange = (key: string, value: string) => {
    setChangedValues(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    if (Object.keys(changedValues).length === 0) {
      setMessage({ type: "error", text: "Nenhuma alteracao para salvar" })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: changedValues })
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Configuracoes salvas com sucesso!" })
        setChangedValues({})
        await fetchSettings()
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Erro ao salvar configuracoes" })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setMessage({ type: "error", text: "Erro ao salvar configuracoes" })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (category: string) => {
    setMessage({ type: "success", text: `Testando conexao ${category}...` })
    try {
      const res = await fetch(`/api/admin/settings/test?category=${category}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: "success", text: `${category}: Conexao bem-sucedida!` })
      } else {
        setMessage({ type: "error", text: `${category}: ${data.error || "Falha na conexao"}` })
      }
    } catch {
      setMessage({ type: "error", text: `${category}: Erro ao testar conexao` })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Configuracoes</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Configuracoes</h1>
          <p className="text-slate-600 mt-1">Gerencie as chaves de API e configuracoes do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={saveSettings} disabled={saving || Object.keys(changedValues).length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-2 ${
          message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-sm underline">Fechar</button>
        </div>
      )}

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-slate-100">
          {settings.map(category => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex items-center gap-2 px-3 py-2"
            >
              {category.icon}
              <span className="hidden sm:inline">{category.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {settings.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {category.icon}
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>Configure as chaves de API para {category.name.toLowerCase()}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => testConnection(category.id)}>
                    Testar Conexao
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {category.keys.map(apiKey => (
                  <div key={apiKey.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={apiKey.key} className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        {apiKey.key}
                        {apiKey.isConfigured && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Configurado
                          </span>
                        )}
                      </Label>
                      {apiKey.isSecret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.key)}
                        >
                          {visibleKeys.has(apiKey.key) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <Input
                      id={apiKey.key}
                      type={apiKey.isSecret && !visibleKeys.has(apiKey.key) ? "password" : "text"}
                      placeholder={apiKey.isConfigured ? "••••••••••••" : "Nao configurado"}
                      value={changedValues[apiKey.key] ?? ""}
                      onChange={(e) => handleValueChange(apiKey.key, e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">{apiKey.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Versao</p>
              <p className="text-lg font-semibold">1.0.0</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Ambiente</p>
              <p className="text-lg font-semibold">{process.env.NODE_ENV || "development"}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Ultima Atualizacao</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
