"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Essencial",
    price: "R$ 79",
    period: "/mês",
    description: "Para psicólogos autônomos que estão começando.",
    features: [
      "Até 10 pacientes ativos",
      "Agenda e Prontuário Eletrônico",
      "Diário Emocional e Mapa Básico",
      "Videoterapia Integrada",
      "Suporte por e-mail",
    ],
    cta: "Começar Teste Grátis",
    variant: "outline",
  },
  {
    name: "Profissional",
    price: "R$ 129",
    period: "/mês",
    description: "A solução completa para escalar sua prática.",
    features: [
      "Pacientes ilimitados",
      "Tudo do plano Essencial",
      "Mapa Emocional com IA Preditiva",
      "Gamificação e Prescrição de Tarefas",
      "Relatórios Avançados",
      "Suporte Prioritário via Chat",
    ],
    cta: "Escolher Profissional",
    variant: "default",
    popular: true,
  },
  {
    name: "Clínica",
    price: "Contato",
    period: "",
    description: "Para clínicas e equipes com múltiplos terapeutas.",
    features: [
      "Tudo do plano Profissional",
      "Gestão de múltiplos psicólogos",
      "Faturamento centralizado",
      "Dashboard administrativo",
      "Opções de White-label",
      "Gerente de conta dedicado",
    ],
    cta: "Agendar Demonstração",
    variant: "outline",
  },
]

export function PricingSection() {
  return (
    <section id="precos" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Planos flexíveis para
            <span className="bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent font-serif">
              {" "}
              cada jornada
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Escolha o plano que melhor se adapta ao seu momento profissional. Cancele quando quiser.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${
                plan.popular ? "border-teal-500 border-2 shadow-2xl relative" : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 right-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Mais Popular
                </div>
              )}
              <CardHeader className="p-6">
                <CardTitle className="text-2xl font-bold text-slate-800">{plan.name}</CardTitle>
                <CardDescription className="text-slate-600 h-10">{plan.description}</CardDescription>
                <div className="flex items-baseline pt-4">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  {plan.period && <span className="text-xl font-medium text-slate-500">{plan.period}</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6 space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="w-5 h-5 text-teal-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6">
                <Button
                  size="lg"
                  className={`w-full ${
                    plan.variant === "default"
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : "bg-transparent border-teal-600 text-teal-600 hover:bg-teal-50"
                  }`}
                  variant={plan.variant as "default" | "outline"}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
