"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      <div className="absolute inset-0">
        <Image
          src="/images/auth-background.png"
          alt="Fundo Abstrato"
          layout="fill"
          objectFit="cover"
          className="opacity-50"
        />
      </div>
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
            <Image
              src="/images/caris-logo-v2.png"
              alt="CÁRIS Logo"
              width={60}
              height={60}
              className="mx-auto mb-4 invert brightness-0"
            />
            <CardTitle className="text-3xl font-bold text-orange-300">Criar Conta</CardTitle>
            <p className="text-teal-100">Inicie sua jornada de clareza existencial.</p>
          </CardHeader>
          <CardContent className="p-8">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  type="text"
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-white/20 border-teal-400 h-12 placeholder:text-teal-200 focus:bg-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30"
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
                    className="bg-white/20 border-teal-400 h-12 pr-10 placeholder:text-teal-200 focus:bg-white/30"
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-full shadow-lg mt-6"
              >
                Registrar
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
