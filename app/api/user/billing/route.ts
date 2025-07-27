import { NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"

// Simulação de dados de billing - em produção viria do Stripe
const mockBillingData = {
  currentPlan: {
    name: "Profissional",
    price: 99.9,
    interval: "monthly",
    renewsAt: "2025-08-15",
    status: "active",
  },
  invoices: [
    {
      id: "inv_001",
      date: "2025-01-15",
      amount: 99.9,
      status: "paid",
      downloadUrl: "/api/invoices/inv_001/download",
    },
    {
      id: "inv_002",
      date: "2024-12-15",
      amount: 99.9,
      status: "paid",
      downloadUrl: "/api/invoices/inv_002/download",
    },
    {
      id: "inv_003",
      date: "2024-11-15",
      amount: 99.9,
      status: "paid",
      downloadUrl: "/api/invoices/inv_003/download",
    },
  ],
  paymentMethod: {
    type: "card",
    last4: "4242",
    brand: "visa",
    expiresAt: "12/2027",
  },
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Em produção, buscar dados reais do Stripe
    return NextResponse.json(mockBillingData)
  } catch (error) {
    console.error("Erro ao buscar dados de billing:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { action, planId } = await request.json()

    if (action === "change_plan") {
      // Em produção, integrar com Stripe para mudança de plano
      return NextResponse.json({
        message: "Plano alterado com sucesso",
        redirectUrl: "/dashboard/settings?tab=billing&success=plan_changed",
      })
    }

    if (action === "cancel_subscription") {
      // Em produção, cancelar assinatura no Stripe
      return NextResponse.json({
        message: "Assinatura cancelada com sucesso",
        cancellationDate: "2025-08-15",
      })
    }

    if (action === "update_payment_method") {
      // Em produção, atualizar método de pagamento no Stripe
      return NextResponse.json({
        message: "Método de pagamento atualizado com sucesso",
      })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar billing:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
