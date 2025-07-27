"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      })
      return
    }

    if (!formData.role) {
      toast({
        title: "Erro", 
        description: "Selecione um tipo de conta",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Falha no registro")
      }

      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-teal-50 relative">
      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="absolute top-0 -mt-12 inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar ao início
        </Link>
        <Card className="bg-teal-600/95 text-white rounded-3xl shadow-2xl backdrop-blur-sm border-0">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">C</span>
            </div>
            <CardTitle className="text-3xl font-bold text-orange-300">Criar Conta</CardTitle>
            <p className="text-teal-100">Inicie sua jornada de clareza existencial.</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de conta</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="bg-white/20 border-teal-400 h-12 text-white">
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Paciente</SelectItem>
                    <SelectItem value="psychologist">Psicólogo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg mt-6"
              >
                {isLoading ? "Criando conta..." : "Registrar"}
              </Button>
              <div className="text-center text-sm pt-2">
                <span className="text-teal-100">Já tem uma conta? </span>
                <Link href="/login" className="font-semibold text-orange-300 hover:text-orange-400">
                  Entrar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
