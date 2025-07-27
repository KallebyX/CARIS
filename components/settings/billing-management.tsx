"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Download, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface BillingData {
  currentPlan: {
    name: string
    price: number
    interval: string
    renewsAt: string
    status: string
  }
  invoices: Array<{
    id: string
    date: string
    amount: number
    status: string
    downloadUrl: string
  }>
  paymentMethod: {
    type: string
    last4: string
    brand: string
    expiresAt: string
  }
}

export function BillingManagement() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const response = await fetch("/api/user/billing")
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error("Erro ao carregar dados de billing:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de pagamento.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBillingAction = async (action: string, data?: any) => {
    setProcessing(true)
    try {
      const response = await fetch("/api/user/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Sucesso",
          description: result.message,
        })

        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        } else {
          fetchBillingData()
        }
      } else {
        throw new Error("Erro ao processar ação")
      }
    } catch (error) {
      console.error("Erro na ação de billing:", error)
      toast({
        title: "Erro",
        description: "Não foi possível processar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  if (!billingData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Erro ao carregar dados de pagamento.</p>
        <Button onClick={fetchBillingData} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Plano Atual
            <Badge variant={billingData.currentPlan.status === "active" ? "default" : "secondary"}>
              {billingData.currentPlan.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </CardTitle>
          <CardDescription>Gerencie sua assinatura e método de pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-lg">{billingData.currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(billingData.currentPlan.price)}/mês</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Próxima cobrança</p>
              <p className="font-medium">{formatDate(billingData.currentPlan.renewsAt)}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            <CreditCard className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">
                {billingData.paymentMethod.brand.toUpperCase()} •••• {billingData.paymentMethod.last4}
              </p>
              <p className="text-sm text-muted-foreground">Expira em {billingData.paymentMethod.expiresAt}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBillingAction("update_payment_method")}
              disabled={processing}
              className="bg-transparent"
            >
              Alterar
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-2 pt-4">
            <Button onClick={() => handleBillingAction("change_plan")} disabled={processing}>
              Mudar de Plano
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBillingAction("update_payment_method")}
              disabled={processing}
              className="bg-transparent"
            >
              Atualizar Pagamento
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="md:ml-auto">
                  Cancelar Assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Cancelar Assinatura
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar sua assinatura? Você perderá acesso a todas as funcionalidades
                    premium no final do período atual ({formatDate(billingData.currentPlan.renewsAt)}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBillingAction("cancel_subscription")}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, Cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Faturas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
          <CardDescription>Baixe suas faturas anteriores.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {billingData.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{formatDate(invoice.date)}</p>
                  <p className="text-sm text-muted-foreground">Fatura #{invoice.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                    <Badge variant={invoice.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {invoice.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(invoice.downloadUrl, "_blank")}
                    className="bg-transparent"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
