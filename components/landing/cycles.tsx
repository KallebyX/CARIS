"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Shield, TrendingUp, Heart } from "lucide-react"

const cycles = [
  {
    title: "Criar",
    description: "Momento de gerar ideias, iniciar projetos e manifestar sua criatividade interior.",
    icon: Sparkles,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    details: "Fase de inspiração e manifestação criativa, onde novas possibilidades emergem.",
  },
  {
    title: "Cuidar",
    description: "Tempo de nutrir relacionamentos, cuidar de si e manter o que já existe.",
    icon: Shield,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    details: "Momento de proteção, nutrição e fortalecimento dos vínculos importantes.",
  },
  {
    title: "Crescer",
    description: "Fase de expansão, aprendizado e desenvolvimento pessoal contínuo.",
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    details: "Período de evolução, onde desafios se transformam em oportunidades de crescimento.",
  },
  {
    title: "Curar",
    description: "Momento de introspecção, cura emocional e renovação interior profunda.",
    icon: Heart,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    details: "Fase de restauração, onde feridas se transformam em sabedoria e força.",
  },
]

export function CyclesSection() {
  return (
    <section id="ciclos" className="py-24 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Os Quatro Ciclos da
            <span className="bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent font-serif">
              {" "}
              Jornada
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            CÁRIS guia você através de quatro ciclos essenciais, permitindo uma compreensão mais profunda de sua
            experiência existencial e crescimento terapêutico.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cycles.map((cycle, index) => (
            <Card
              key={cycle.title}
              className="group hover:shadow-2xl transition-all-smooth border-0 bg-white/80 backdrop-blur-sm hover:-translate-y-2"
            >
              <CardContent className="p-8 text-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-current to-transparent"></div>
                </div>

                {/* Icon */}
                <div
                  className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${cycle.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <cycle.icon className="w-10 h-10 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{cycle.title}</h3>
                <p className="text-slate-600 mb-4 leading-relaxed">{cycle.description}</p>

                {/* Details */}
                <div className={`${cycle.bgColor} rounded-lg p-4 mt-6`}>
                  <p className={`text-sm ${cycle.textColor} font-medium`}>{cycle.details}</p>
                </div>

                {/* Cycle Number */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-600">{index + 1}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cycle Flow Visualization */}
        <div className="mt-16 relative">
          <div className="flex justify-center items-center space-x-8 overflow-x-auto pb-4">
            {cycles.map((cycle, index) => (
              <div key={cycle.title} className="flex items-center">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${cycle.color} flex items-center justify-center shadow-lg animate-pulse-soft`}
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  <cycle.icon className="w-8 h-8 text-white" />
                </div>
                {index < cycles.length - 1 && (
                  <div className="w-12 h-0.5 bg-gradient-to-r from-slate-300 to-slate-400 mx-4"></div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 mt-6 text-sm">
            Fluxo natural dos ciclos terapêuticos • Adaptável ao ritmo de cada pessoa
          </p>
        </div>
      </div>
    </section>
  )
}
