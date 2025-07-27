"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, MapPin, Phone, Mail, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CustomerData {
  name: string
  email: string
  document: string
  phone: string
}

interface BillingData {
  address: string
  city: string
  state: string
  zipCode: string
}

interface CheckoutFormProps {
  customerData: CustomerData
  billingData: BillingData
  onSubmit: (customerData: CustomerData, billingData: BillingData) => void
}

const brazilianStates = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
]

export function CheckoutForm({ customerData, billingData, onSubmit }: CheckoutFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    customer: customerData,
    billing: billingData
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '')
    if (cleanCPF.length !== 11) return false
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCPF)) return false
    
    // Algoritmo de validação do CPF
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false
    
    return true
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length >= 10 && cleanPhone.length <= 11
  }

  const validateCEP = (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '')
    return cleanCEP.length === 8
  }

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/)
    if (match) {
      return match[1] + '.' + match[2] + '.' + match[3] + '-' + match[4]
    }
    return value
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
      const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/)
      if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3]
      }
    } else if (cleaned.length === 10) {
      const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/)
      if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3]
      }
    }
    return value
  }

  const formatCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{5})(\d{3})$/)
    if (match) {
      return match[1] + '-' + match[2]
    }
    return value
  }

  const handleInputChange = (field: string, value: string, type: 'customer' | 'billing') => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
    
    // Limpar erro quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar dados do cliente
    if (!formData.customer.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!formData.customer.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!validateEmail(formData.customer.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!formData.customer.document.trim()) {
      newErrors.document = 'CPF é obrigatório'
    } else if (!validateCPF(formData.customer.document)) {
      newErrors.document = 'CPF inválido'
    }

    if (!formData.customer.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (!validatePhone(formData.customer.phone)) {
      newErrors.phone = 'Telefone inválido'
    }

    // Validar dados de endereço
    if (!formData.billing.address.trim()) {
      newErrors.address = 'Endereço é obrigatório'
    }

    if (!formData.billing.city.trim()) {
      newErrors.city = 'Cidade é obrigatória'
    }

    if (!formData.billing.state) {
      newErrors.state = 'Estado é obrigatório'
    }

    if (!formData.billing.zipCode.trim()) {
      newErrors.zipCode = 'CEP é obrigatório'
    } else if (!validateCEP(formData.billing.zipCode)) {
      newErrors.zipCode = 'CEP inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData.customer, formData.billing)
    } else {
      toast({
        title: "Dados incompletos",
        description: "Por favor, corrija os campos destacados.",
        variant: "destructive"
      })
    }
  }

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '')
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
        const data = await response.json()
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            billing: {
              ...prev.billing,
              address: data.logradouro || '',
              city: data.localidade || '',
              state: data.uf || ''
            }
          }))
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-teal-600" />
          Informações Pessoais
        </CardTitle>
        <CardDescription>
          Preencha seus dados para finalizar a assinatura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados Pessoais
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.customer.name}
                  onChange={(e) => handleInputChange('name', e.target.value, 'customer')}
                  placeholder="Digite seu nome completo"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customer.email}
                  onChange={(e) => handleInputChange('email', e.target.value, 'customer')}
                  placeholder="seu@email.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="document">CPF *</Label>
                <Input
                  id="document"
                  value={formData.customer.document}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value)
                    handleInputChange('document', formatted, 'customer')
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={errors.document ? "border-red-500" : ""}
                />
                {errors.document && (
                  <p className="text-sm text-red-500 mt-1">{errors.document}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.customer.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    handleInputChange('phone', formatted, 'customer')
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Endereço de Cobrança */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço de Cobrança
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zipCode">CEP *</Label>
                <Input
                  id="zipCode"
                  value={formData.billing.zipCode}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value)
                    handleInputChange('zipCode', formatted, 'billing')
                  }}
                  onBlur={(e) => fetchAddressByCEP(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className={errors.zipCode ? "border-red-500" : ""}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">Estado *</Label>
                <Select
                  value={formData.billing.state}
                  onValueChange={(value) => handleInputChange('state', value, 'billing')}
                >
                  <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço Completo *</Label>
                <Input
                  id="address"
                  value={formData.billing.address}
                  onChange={(e) => handleInputChange('address', e.target.value, 'billing')}
                  placeholder="Rua, número, complemento"
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.billing.city}
                  onChange={(e) => handleInputChange('city', e.target.value, 'billing')}
                  placeholder="Nome da cidade"
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" size="lg">
            Continuar para Confirmação
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 