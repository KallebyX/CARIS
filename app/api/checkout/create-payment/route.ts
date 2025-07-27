import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
}

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

// Função para integrar com MercadoPago MCP
async function createMercadoPagoPayment(
  plan: Plan,
  customer: CustomerData,
  billing: BillingData,
  paymentMethod: string
) {
  // Calcular preço final (com desconto PIX se aplicável)
  const discount = paymentMethod === "pix" ? 0.05 : 0
  const finalPrice = plan.price * (1 - discount)

  // Dados do pagamento para MercadoPago
  const paymentData = {
    transaction_amount: finalPrice,
    description: `Assinatura Caris SaaS Pro - Plano ${plan.name}`,
    payment_method_id: getPaymentMethodId(paymentMethod),
    payer: {
      first_name: customer.name.split(' ')[0],
      last_name: customer.name.split(' ').slice(1).join(' '),
      email: customer.email,
      identification: {
        type: "CPF",
        number: customer.document.replace(/\D/g, '')
      },
      phone: {
        area_code: customer.phone.replace(/\D/g, '').substring(0, 2),
        number: customer.phone.replace(/\D/g, '').substring(2)
      },
      address: {
        street_name: billing.address,
        zip_code: billing.zipCode.replace(/\D/g, ''),
        city: billing.city,
        state: billing.state
      }
    },
    external_reference: `caris-${Date.now()}`,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    metadata: {
      plan_id: plan.id,
      plan_name: plan.name,
      subscription_type: "monthly"
    }
  }

  try {
    // Simular integração com MercadoPago MCP
    // Em produção, usar o MCP real: await mercadopagoMCP.createPayment(paymentData)
    
    const mockResponse = {
      success: true,
      id: `mp_${Date.now()}`,
      status: paymentMethod === "pix" ? "pending" : "approved",
      status_detail: paymentMethod === "pix" ? "pending_waiting_payment" : "accredited",
      transaction_amount: finalPrice,
      payment_method_id: getPaymentMethodId(paymentMethod),
      
      // Para PIX, retornar dados QR Code
      ...(paymentMethod === "pix" && {
        point_of_interaction: {
          transaction_data: {
            qr_code: "00020126360014BR.GOV.BCB.PIX...", // QR Code mock
            qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAA..." // Base64 mock
          }
        }
      }),

      // Para cartão, dados da transação
      ...(paymentMethod === "credit_card" && {
        card: {
          last_four_digits: "1234",
          cardholder: {
            name: customer.name
          }
        }
      }),

      // Para boleto
      ...(paymentMethod === "bank_slip" && {
        transaction_details: {
          external_resource_url: "https://mercadopago.com/boleto/123456"
        }
      }),

      date_created: new Date().toISOString(),
      date_approved: paymentMethod !== "pix" ? new Date().toISOString() : null
    }

    return mockResponse

  } catch (error) {
    console.error("Erro no MercadoPago:", error)
    throw new Error("Falha ao processar pagamento")
  }
}

function getPaymentMethodId(method: string): string {
  const methodMap = {
    "credit_card": "visa", // Em produção, seria dinâmico baseado no cartão
    "debit_card": "debvisa",
    "pix": "pix",
    "bank_slip": "bolbradesco"
  }
  return methodMap[method as keyof typeof methodMap] || "visa"
}

// Função para criar assinatura no banco
async function createSubscription(
  userId: number,
  planId: string,
  paymentId: string,
  paymentData: any
) {
  // Em produção, criar registro na tabela de assinaturas
  // Por enquanto, apenas simular
  
  const subscription = {
    id: `sub_${Date.now()}`,
    user_id: userId,
    plan_id: planId,
    payment_id: paymentId,
    status: paymentData.status === "approved" ? "active" : "pending",
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    created_at: new Date(),
    updated_at: new Date()
  }

  // TODO: Salvar no banco de dados
  console.log("Subscription created:", subscription)
  
  return subscription
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    const body = await request.json()
    const { plan, customer, billing, paymentMethod } = body

    // Validar dados obrigatórios
    if (!plan || !customer || !billing || !paymentMethod) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Dados incompletos" 
        }, 
        { status: 400 }
      )
    }

    // Validar plano
    const validPlans = ["essential", "professional", "clinic"]
    if (!validPlans.includes(plan.id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Plano inválido" 
        }, 
        { status: 400 }
      )
    }

    // Criar pagamento no MercadoPago
    const paymentResult = await createMercadoPagoPayment(
      plan,
      customer,
      billing,
      paymentMethod
    )

    if (!paymentResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Falha ao processar pagamento" 
        }, 
        { status: 400 }
      )
    }

    // Criar assinatura
    let subscription = null
    if (userId) {
      subscription = await createSubscription(
        userId,
        plan.id,
        paymentResult.id,
        paymentResult
      )
    }

    // Resposta baseada no método de pagamento
    if (paymentMethod === "pix") {
      return NextResponse.json({
        success: true,
        paymentId: paymentResult.id,
        status: "pending",
        paymentMethod: "pix",
        qrCode: paymentResult.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64,
        expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        message: "Pagamento PIX gerado com sucesso",
        redirectUrl: `/checkout/pix?payment=${paymentResult.id}`
      })
    }

    if (paymentMethod === "bank_slip") {
      return NextResponse.json({
        success: true,
        paymentId: paymentResult.id,
        status: "pending",
        paymentMethod: "bank_slip",
        boletoUrl: paymentResult.transaction_details?.external_resource_url,
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
        message: "Boleto gerado com sucesso",
        redirectUrl: `/checkout/boleto?payment=${paymentResult.id}`
      })
    }

    // Cartão de crédito/débito
    if (paymentResult.status === "approved") {
      return NextResponse.json({
        success: true,
        paymentId: paymentResult.id,
        status: "approved",
        paymentMethod,
        message: "Pagamento aprovado com sucesso",
        redirectUrl: `/checkout/success?payment=${paymentResult.id}`
      })
    } else {
      return NextResponse.json({
        success: false,
        paymentId: paymentResult.id,
        status: paymentResult.status,
        error: "Pagamento rejeitado",
        message: "Não foi possível processar seu pagamento. Verifique os dados do cartão."
      }, { status: 400 })
    }

  } catch (error) {
    console.error("Erro no checkout:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Erro interno do servidor" 
      }, 
      { status: 500 }
    )
  }
}

// Webhook para receber notificações do MercadoPago
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const paymentId = searchParams.get("id")
  const topic = searchParams.get("topic")

  if (topic === "payment" && paymentId) {
    try {
      // Buscar detalhes do pagamento no MercadoPago
      // const paymentDetails = await mercadopagoMCP.getPayment(paymentId)
      
      // Atualizar status da assinatura no banco
      console.log(`Webhook recebido: Payment ${paymentId} - Topic: ${topic}`)
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Erro no webhook:", error)
      return NextResponse.json({ error: "Webhook error" }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
} 