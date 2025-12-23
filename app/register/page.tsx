"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/lib/i18n"

export default function RegisterPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    dataProcessingConsent: false,
    termsAccepted: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: tCommon('error'),
        description: tErrors('passwordMismatch'),
        variant: "destructive",
      })
      return
    }

    if (!formData.role) {
      toast({
        title: tCommon('error'),
        description: tErrors('required'),
        variant: "destructive",
      })
      return
    }

    if (!formData.dataProcessingConsent || !formData.termsAccepted) {
      toast({
        title: tCommon('error'),
        description: t('consentRequired') || "Você precisa aceitar os termos para continuar.",
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
          dataProcessingConsent: formData.dataProcessingConsent,
          termsAccepted: formData.termsAccepted,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || tErrors('generic'))
      }

      toast({
        title: tCommon('success'),
        description: t('accountCreated'),
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: tCommon('error'),
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
          {tCommon('back')}
        </Link>
        <Card className="bg-teal-600/95 text-white rounded-3xl shadow-2xl backdrop-blur-sm border-0">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">C</span>
            </div>
            <CardTitle className="text-3xl font-bold text-orange-300">{t('registerTitle')}</CardTitle>
            <p className="text-teal-100">{t('registerPrompt')}</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-white/20 border-teal-400 h-12 text-white disabled:opacity-50">
                    <SelectValue placeholder={t('role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">{t('patient')}</SelectItem>
                    <SelectItem value="psychologist">{t('psychologist')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30 disabled:opacity-50"
                    required
                    minLength={6}
                    disabled={isLoading}
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30 disabled:opacity-50"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 hover:text-white disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="dataProcessingConsent"
                    checked={formData.dataProcessingConsent}
                    onCheckedChange={(checked) =>
                      setFormData({...formData, dataProcessingConsent: checked === true})
                    }
                    disabled={isLoading}
                    className="border-white data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 mt-0.5"
                  />
                  <Label htmlFor="dataProcessingConsent" className="text-sm text-teal-100 leading-tight cursor-pointer">
                    {t('dataProcessingConsent') || "Autorizo o processamento dos meus dados para funcionamento da plataforma."}
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="termsAccepted"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) =>
                      setFormData({...formData, termsAccepted: checked === true})
                    }
                    disabled={isLoading}
                    className="border-white data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 mt-0.5"
                  />
                  <Label htmlFor="termsAccepted" className="text-sm text-teal-100 leading-tight cursor-pointer">
                    {t('termsAccepted') || "Li e aceito os"}{" "}
                    <Link href="/terms" className="text-orange-300 hover:text-orange-400 underline">
                      {t('termsOfService') || "Termos de Uso"}
                    </Link>{" "}
                    {t('and') || "e"}{" "}
                    <Link href="/privacy" className="text-orange-300 hover:text-orange-400 underline">
                      {t('privacyPolicy') || "Política de Privacidade"}
                    </Link>.
                  </Label>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !formData.dataProcessingConsent || !formData.termsAccepted}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? tCommon('saving') : t('register')}
              </Button>
              <div className="text-center text-sm pt-2">
                <span className="text-teal-100">{t('loginTitle')}? </span>
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
