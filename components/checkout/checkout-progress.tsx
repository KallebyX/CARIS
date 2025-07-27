"use client"

import { Check } from "lucide-react"

interface CheckoutProgressProps {
  currentStep: number
}

const steps = [
  { id: 1, name: "Plano", description: "Escolha seu plano" },
  { id: 2, name: "Pagamento", description: "Método de pagamento" },
  { id: 3, name: "Dados", description: "Informações pessoais" },
  { id: 4, name: "Confirmar", description: "Finalizar compra" }
]

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                  ${
                    currentStep > step.id
                      ? "bg-teal-600 border-teal-600 text-white"
                      : currentStep === step.id
                      ? "bg-teal-100 border-teal-600 text-teal-600"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }
                `}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id ? "text-teal-600" : "text-gray-500"
                  }`}
                >
                  {step.name}
                </p>
                <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
              </div>
            </div>

            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  h-0.5 w-16 md:w-24 lg:w-32 mx-4 transition-colors
                  ${currentStep > step.id ? "bg-teal-600" : "bg-gray-300"}
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 