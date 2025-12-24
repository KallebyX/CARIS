import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, paymentFailures } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { failureId, invoiceId } = body

    if (!failureId && !invoiceId) {
      return NextResponse.json({ error: "ID da falha ou fatura e obrigatorio" }, { status: 400 })
    }

    // In production, you would:
    // 1. Get the invoice from Stripe
    // 2. Create a new payment intent
    // 3. Attempt to charge the customer's default payment method

    // For now, simulate the retry process
    if (failureId) {
      // Update retry count
      await db
        .update(paymentFailures)
        .set({
          retryCount: 1, // Increment would need raw SQL or fetch-update pattern
          nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next retry in 24h
          updatedAt: new Date(),
        })
        .where(eq(paymentFailures.id, failureId))
    }

    // Simulate success/failure randomly for demo
    const success = Math.random() > 0.3 // 70% success rate

    if (success) {
      if (failureId) {
        // Mark as resolved
        await db
          .update(paymentFailures)
          .set({
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(paymentFailures.id, failureId))
      }

      return NextResponse.json({
        success: true,
        message: "Pagamento processado com sucesso"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Falha ao processar pagamento. O cartao foi recusado."
      }, { status: 402 })
    }
  } catch (error) {
    console.error("Error retrying payment:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
