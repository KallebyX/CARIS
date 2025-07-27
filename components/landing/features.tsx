"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Brain,
  Calendar,
  Users,
  BarChart3,
  Video,
  MessageCircle,
  Shield,
  Sparkles,
  Heart,
  Zap,
  Target,
  Headphones,
} from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Diário Emocional com IA",
    description: "Registro sensorial guiado com análise inteligente de padrões emocionais e alertas de risco.",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: BarChart3,
    title: "Mapa Emocional Interativo",
    description: "Visualização cinematográfica da evolução emocional com insights preditivos e correlações.",
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
  },
  {
    icon: Calendar,
    title: "Agenda Integrada",
    description: "Sincronização com Google Calendar, notificações automáticas e gestão completa de sessões.",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Video,
    title: "Videoterapia Nativa",
    description: "Plataforma integrada de videoconferência com ferramentas terapêuticas e gravação segura.",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Users,
    title: "Gestão de Pacientes",
    description: "Prontuário eletrônico completo, anamnese personalizável e histórico detalhado.",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    icon: MessageCircle,
    title: "Chat Terapêutico Seguro",
    description: "Comunicação assíncrona criptografada entre sessões com moderação inteligente.",
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    icon: Heart,
    title: "Sistema SOS de Crise",
    description: "Botão de emergência com técnicas imediatas de regulação emocional e alertas ao terapeuta.",
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
  },
  {
    icon: Target,
    title: "Prescrição de Tarefas",
    description: "Biblioteca de exercícios terapêuticos com acompanhamento de progresso e gamificação.",
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    icon: Headphones,
    title: "Meditações Guiadas",
    description: "Acervo de conteúdos psicoeducativos, exercícios de mindfulness e relaxamento.",
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    icon: Zap,
    title: "IA de Suporte Clínico",
    description: "Assistente inteligente para análise de sessões, sugestões terapêuticas e detecção de padrões.",
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Shield,
    title: "Segurança LGPD",
    description: "Criptografia end-to-end, consentimento digital e conformidade total com regulamentações.",
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-50",
  },
  {
    icon: Sparkles,
    title: "Gamificação Terapêutica",
    description: "Sistema de conquistas, desafios semanais e recompensas para engajamento no tratamento.",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
  },
]

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Funcionalidades
            <span className="bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent font-serif">
              {" "}
              Inovadoras
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Tecnologia de ponta combinada com sensibilidade terapêutica para criar a experiência mais completa e eficaz
            do mercado.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group hover:shadow-xl transition-all-smooth border-0 bg-gradient-to-br from-white to-slate-50 hover:-translate-y-1"
            >
              <CardContent className="p-6 relative overflow-hidden">
                {/* Background Glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                ></div>

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>

                {/* Hover Effect */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl p-8 md:p-12">
            <h3 className="text-3xl font-bold text-slate-800 mb-4">
              Pronto para revolucionar sua prática terapêutica?
            </h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de psicólogos que já transformaram seus atendimentos com CÁRIS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-caris-gradient hover:opacity-90 text-white shadow-lg px-8">
                Teste Grátis por 30 Dias
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-slate-300 hover:border-teal-500 bg-transparent"
              >
                Agendar Demonstração
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
