"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { BillingManagement } from "@/components/settings/billing-management"
import { CalendarManagement } from "@/components/settings/calendar-management"
import { Eye, EyeOff } from "lucide-react"

interface UserSettings {
  settings: {
    emailNotifications: boolean
    pushNotifications: boolean
    sessionReminders: boolean
    diaryReminders: boolean
    theme: string
    language: string
  }
  user: {
    id: number
    name: string
    email: string
    role: string
    profile?: {
      crp?: string
      bio?: string
      avatar?: string
    }
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const { toast } = useToast()

  // Estados para os formulários
  const [profileForm, setProfileForm] = useState({
    name: "",
    crp: "",
    bio: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    sessionReminders: true,
    diaryReminders: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/user/settings")
      if (response.ok) {
        const settingsData = await response.json()
        setData(settingsData)

        // Preencher formulários
        setProfileForm({
          name: settingsData.user.name || "",
          crp: settingsData.user.profile?.crp || "",
          bio: settingsData.user.profile?.bio || "",
        })

        setNotificationSettings({
          emailNotifications: settingsData.settings.emailNotifications,
          pushNotifications: settingsData.settings.pushNotifications,
          sessionReminders: settingsData.settings.sessionReminders,
          diaryReminders: settingsData.settings.diaryReminders,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (type: string, data: any) => {
    setSaving(true)
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações atualizadas com sucesso!",
        })
        fetchSettings() // Recarregar dados
      } else {
        throw new Error("Erro ao atualizar configurações")
      }
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings("profile", profileForm)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso!",
        })
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Erro ao alterar senha")
      }
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value }
    setNotificationSettings(newSettings)
    updateSettings("notifications", newSettings)
  }

  const handleAvatarChange = (avatarUrl: string) => {
    if (data) {
      setData({
        ...data,
        user: {
          ...data.user,
          profile: {
            ...data.user.profile,
            avatar: avatarUrl,
          },
        },
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Erro ao carregar configurações.</p>
        <Button onClick={fetchSettings} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-600">Gerencie suas informações de perfil, conta e notificações.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="billing">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil Público</CardTitle>
              <CardDescription>
                {data.user.role === "psychologist"
                  ? "Informações que serão vistas por seus pacientes."
                  : "Suas informações pessoais."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <AvatarUpload
                  currentAvatar={data.user.profile?.avatar}
                  userName={data.user.name}
                  onAvatarChange={handleAvatarChange}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  {data.user.role === "psychologist" && (
                    <div className="space-y-2">
                      <Label htmlFor="crp">CRP</Label>
                      <Input
                        id="crp"
                        value={profileForm.crp}
                        onChange={(e) => setProfileForm({ ...profileForm, crp: e.target.value })}
                        placeholder="Ex: 06/12345"
                      />
                    </div>
                  )}
                </div>

                {data.user.role === "psychologist" && (
                  <div className="space-y-2">
                    <Label htmlFor="bio">Mini Biografia</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Fale um pouco sobre sua abordagem terapêutica..."
                    />
                  </div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-6">
            {/* Informações da Conta */}
            <Card>
              <CardHeader>
                <CardTitle>Informações da Conta</CardTitle>
                <CardDescription>Suas informações básicas de login.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={data.user.email} disabled className="bg-gray-50" />
                  <p className="text-xs text-muted-foreground">
                    Para alterar seu e-mail, entre em contato com o suporte.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Alterar Senha */}
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Mantenha sua conta segura com uma senha forte.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Escolha como você quer ser notificado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Novas mensagens no chat</Label>
                  <p className="text-sm text-muted-foreground">Receber notificações push e por e-mail.</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Notificações push</Label>
                  <p className="text-sm text-muted-foreground">Receber notificações no navegador.</p>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Lembretes de sessão</Label>
                  <p className="text-sm text-muted-foreground">24 horas antes de cada sessão.</p>
                </div>
                <Switch
                  checked={notificationSettings.sessionReminders}
                  onCheckedChange={(checked) => handleNotificationChange("sessionReminders", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>{data.user.role === "psychologist" ? "Entradas no diário" : "Lembretes do diário"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {data.user.role === "psychologist"
                      ? "Ser notificado quando um paciente fizer uma nova entrada."
                      : "Receber lembretes para escrever no diário."}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.diaryReminders}
                  onCheckedChange={(checked) => handleNotificationChange("diaryReminders", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarManagement />
        </TabsContent>

        <TabsContent value="billing">
          <BillingManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
