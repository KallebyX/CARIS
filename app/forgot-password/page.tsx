"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/lib/i18n"

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || tErrors('generic'))
      }

      setIsSubmitted(true)
    } catch (error: any) {
      // Show success even on error to prevent email enumeration
      setIsSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-teal-50 relative">
        <div className="w-full max-w-md relative z-10">
          <Link
            href="/login"
            className="absolute top-0 -mt-12 inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('backToLogin') || "Voltar ao login"}
          </Link>
          <Card className="bg-teal-600/95 text-white rounded-3xl shadow-2xl backdrop-blur-sm border-0">
            <CardHeader className="text-center pt-10 pb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-orange-300">
                {t('checkEmail') || "Verifique seu e-mail"}
              </CardTitle>
              <p className="text-teal-100 mt-4">
                {t('resetEmailSent') || "Se um usuário com este e-mail existir, você receberá instruções para redefinir sua senha."}
              </p>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg transition-colors"
                >
                  {t('backToLogin') || "Voltar ao login"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-teal-50 relative">
      <div className="w-full max-w-md relative z-10">
        <Link
          href="/login"
          className="absolute top-0 -mt-12 inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {t('backToLogin') || "Voltar ao login"}
        </Link>
        <Card className="bg-teal-600/95 text-white rounded-3xl shadow-2xl backdrop-blur-sm border-0">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-300">
              {t('forgotPassword') || "Esqueci minha senha"}
            </CardTitle>
            <p className="text-teal-100">
              {t('forgotPasswordSubtitle') || "Informe seu e-mail para receber instruções de recuperação."}
            </p>
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
                  placeholder={t('emailPlaceholder') || "seu@email.com"}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30 disabled:opacity-50"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? tCommon('loading') : (t('sendResetLink') || "Enviar link de recuperação")}
              </Button>
              <div className="text-center text-sm">
                <span className="text-teal-100">{t('rememberPassword') || "Lembrou sua senha?"} </span>
                <Link
                  href="/login"
                  className={`font-semibold text-orange-300 hover:text-orange-400 transition-colors ${isLoading ? "pointer-events-none opacity-50" : ""}`}
                >
                  {t('login')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
