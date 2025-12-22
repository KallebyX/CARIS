"use client"

import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/lib/i18n"

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Limpa qualquer estado anterior quando a página carrega
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Limpa localStorage e sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Remove dados específicos se existirem
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      localStorage.removeItem("preferences")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('invalidCredentials'))
      }

      const data = await res.json()

      // Redireciona baseado no role do usuário
      if (data.user.role === "psychologist") {
        router.push("/dashboard")
      } else if (data.user.role === "patient") {
        router.push("/dashboard/journey")
      } else if (data.user.role === "admin") {
        router.push("/admin")
      }
    } catch (err: any) {
      setError(err.message)
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
          {tCommon('back')}
        </Link>
        <Card className="bg-teal-600/95 text-white rounded-3xl shadow-2xl backdrop-blur-sm border-0">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">C</span>
            </div>
            <CardTitle className="text-3xl font-bold text-orange-300">{t('login')}</CardTitle>
            <p className="text-teal-100">{t('loginSubtitle')}</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 hover:text-white disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    disabled={isLoading}
                    className="border-white data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 disabled:opacity-50"
                  />
                  <Label htmlFor="remember" className={isLoading ? "opacity-50" : ""}>
                    {t('rememberMe')}
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className={`text-teal-200 hover:text-white transition-colors ${isLoading ? "pointer-events-none opacity-50" : ""}`}
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? tCommon('loading') : t('login')}
              </Button>
              {error && <p className="text-sm text-orange-300 bg-red-900/50 p-2 rounded-md text-center">{error}</p>}
              <div className="text-center text-sm">
                <span className="text-teal-100">{t('registerSubtitle')} </span>
                <Link
                  href="/register"
                  className={`font-semibold text-orange-300 hover:text-orange-400 transition-colors ${isLoading ? "pointer-events-none opacity-50" : ""}`}
                >
                  {t('register')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
