import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, subscriptions, customers } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "active"
    const limit = parseInt(searchParams.get("limit") || "50")

    // Get subscriptions with user data
    const subscriptionList = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        planId: subscriptions.planId,
        planName: subscriptions.planName,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        userId: subscriptions.userId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, status))
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)

    // Get user details for each subscription
    const subscriptionsWithUsers = await Promise.all(
      subscriptionList.map(async (sub) => {
        const subUser = await db.query.users.findFirst({
          where: eq(users.id, sub.userId),
          columns: {
            id: true,
            name: true,
            email: true,
          }
        })

        return {
          ...sub,
          user: subUser || { id: sub.userId, name: "Usuario desconhecido", email: "" },
        }
      })
    )

    return NextResponse.json({ success: true, data: subscriptionsWithUsers })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Cancel subscription
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
    const { subscriptionId, immediate } = body

    if (!subscriptionId) {
      return NextResponse.json({ error: "ID da assinatura e obrigatorio" }, { status: 400 })
    }

    // In production, you would call Stripe API to cancel the subscription
    // For now, just update the database
    await db
      .update(subscriptions)
      .set({
        status: immediate ? "canceled" : "active",
        cancelAtPeriodEnd: !immediate,
        canceledAt: immediate ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))

    return NextResponse.json({
      success: true,
      message: immediate
        ? "Assinatura cancelada imediatamente"
        : "Assinatura sera cancelada ao fim do periodo"
    })
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
