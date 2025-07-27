"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Calendar, BarChart3, LifeBuoy } from "lucide-react"
import Link from "next/link"

export default function JourneyPage() {
  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">Sua Jornada</h1>
        <p className="text-gray-600">Continue sua caminhada de autoconhecimento</p>
      </div>

      {/* SOS Button */}
      <Card className="bg-red-50 border-2 border-red-200 shadow-lg">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-red-800">Precisa de ajuda agora?</h3>
            <p className="text-red-700">Acesse nossas ferramentas de regulação emocional para momentos de crise.</p>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto" asChild>
            <Link href="/dashboard/sos">
              <LifeBuoy className="w-5 h-5 mr-2" />
              Acessar SOS
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Current Cycle */}
      <Card className="border-2 border-[#2D9B9B]">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Ciclo Atual: Crescer</h3>
          <p className="text-gray-600 mb-4">Fase de expansão e desenvolvimento pessoal</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "65%" }}></div>
          </div>
          <p className="text-sm text-gray-600">65% concluído</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
          <Link href="/dashboard/diary">
            <CardContent className="p-6 text-center">
              <Brain className="w-12 h-12 text-[#2D9B9B] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Diário Emocional</h3>
              <p className="text-gray-600 text-sm">Registre suas reflexões e emoções</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
          <Link href="/dashboard/sessions">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-[#F4A261] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Próxima Sessão</h3>
              <p className="text-gray-600 text-sm">Amanhã às 14:00</p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  )
}
