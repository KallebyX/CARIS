"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, Info, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ConsentFormData {
  dataProcessingConsent: boolean
  termsAccepted: boolean
  marketingConsent: boolean
  analyticsConsent: boolean
}

interface ConsentFormProps {
  onConsentChange: (consents: ConsentFormData) => void
  initialValues?: Partial<ConsentFormData>
  showOptional?: boolean
}

export function ConsentForm({ onConsentChange, initialValues = {}, showOptional = true }: ConsentFormProps) {
  const [consents, setConsents] = useState<ConsentFormData>({
    dataProcessingConsent: initialValues.dataProcessingConsent || false,
    termsAccepted: initialValues.termsAccepted || false,
    marketingConsent: initialValues.marketingConsent || false,
    analyticsConsent: initialValues.analyticsConsent || false,
  })

  const updateConsent = (key: keyof ConsentFormData, value: boolean) => {
    const newConsents = { ...consents, [key]: value }
    setConsents(newConsents)
    onConsentChange(newConsents)
  }

  const isValid = consents.dataProcessingConsent && consents.termsAccepted

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Consentimento e Privacidade
        </CardTitle>
        <CardDescription>
          De acordo com a LGPD/GDPR, precisamos do seu consentimento para processar seus dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consentimentos Obrigatórios */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-900">Consentimentos Obrigatórios</h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <Checkbox
                id="dataProcessing"
                checked={consents.dataProcessingConsent}
                onCheckedChange={(checked) => updateConsent('dataProcessingConsent', checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="dataProcessing" className="text-sm font-medium cursor-pointer">
                  Consentimento para Processamento de Dados
                </Label>
                <p className="text-xs text-gray-600">
                  Autorizo o processamento dos meus dados pessoais para o funcionamento da plataforma de saúde mental, 
                  incluindo criação de conta, agendamento de sessões, e comunicação com profissionais.
                </p>
                <div className="text-xs text-blue-600">
                  <strong>Base Legal:</strong> Consentimento (Art. 7º, I da LGPD)
                  <br />
                  <strong>Finalidade:</strong> Prestação de serviços de saúde mental
                  <br />
                  <strong>Retenção:</strong> 7 anos (ou conforme configuração)
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <Checkbox
                id="terms"
                checked={consents.termsAccepted}
                onCheckedChange={(checked) => updateConsent('termsAccepted', checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  Aceito os Termos de Uso e Política de Privacidade
                </Label>
                <p className="text-xs text-gray-600">
                  Li e concordo com os{" "}
                  <Link href="/terms" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Termos de Uso <ExternalLink className="h-3 w-3" />
                  </Link>
                  {" "}e{" "}
                  <Link href="/privacy-policy" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Política de Privacidade <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Consentimentos Opcionais */}
        {showOptional && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Consentimentos Opcionais</h4>
            <p className="text-xs text-gray-600">
              Você pode alterar essas preferências a qualquer momento nas configurações de privacidade.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="marketing"
                  checked={consents.marketingConsent}
                  onCheckedChange={(checked) => updateConsent('marketingConsent', checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                    Comunicações de Marketing
                  </Label>
                  <p className="text-xs text-gray-600">
                    Aceito receber emails sobre novidades, dicas de bem-estar e conteúdos educacionais.
                  </p>
                  <div className="text-xs text-gray-500">
                    <strong>Base Legal:</strong> Consentimento • <strong>Finalidade:</strong> Marketing direto
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="analytics"
                  checked={consents.analyticsConsent}
                  onCheckedChange={(checked) => updateConsent('analyticsConsent', checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="analytics" className="text-sm font-medium cursor-pointer">
                    Analytics e Melhorias
                  </Label>
                  <p className="text-xs text-gray-600">
                    Permito a análise anônima de uso da plataforma para melhorar a experiência do usuário.
                  </p>
                  <div className="text-xs text-gray-500">
                    <strong>Base Legal:</strong> Interesse legítimo • <strong>Finalidade:</strong> Melhoria do produto
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informações Importantes */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Seus Direitos:</strong> Você pode acessar, corrigir, exportar ou solicitar a exclusão dos seus dados 
            a qualquer momento. Também pode revogar consentimentos nas configurações de privacidade.
            Para exercer seus direitos, acesse a seção "Privacidade" no seu dashboard.
          </AlertDescription>
        </Alert>

        {!isValid && (
          <Alert>
            <AlertDescription className="text-xs">
              Os consentimentos obrigatórios são necessários para criar sua conta e utilizar a plataforma.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

interface ConsentSummaryProps {
  consents: ConsentFormData
}

export function ConsentSummary({ consents }: ConsentSummaryProps) {
  const consentItems = [
    {
      key: 'dataProcessingConsent' as const,
      label: 'Processamento de Dados',
      required: true,
    },
    {
      key: 'termsAccepted' as const,
      label: 'Termos de Uso',
      required: true,
    },
    {
      key: 'marketingConsent' as const,
      label: 'Marketing',
      required: false,
    },
    {
      key: 'analyticsConsent' as const,
      label: 'Analytics',
      required: false,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumo dos Consentimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {consentItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm">
                {item.label}
                {item.required && <span className="text-red-500 ml-1">*</span>}
              </span>
              <span className={`text-sm font-medium ${
                consents[item.key] ? 'text-green-600' : 'text-gray-400'
              }`}>
                {consents[item.key] ? 'Concedido' : 'Não concedido'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}